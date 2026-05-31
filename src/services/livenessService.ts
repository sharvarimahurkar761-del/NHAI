import type { FaceBounds } from '../utils/faceDetection';
import monitoring from './monitoringService';

export type LivenessPhase = 'idle' | 'blink' | 'headLeft' | 'headRight' | 'passed' | 'failed';

export interface LivenessState {
  phase: LivenessPhase;
  prompt: string;
  step: number;
  total: number;
  success: boolean;
  failureReason?: string;
  startedAt: number;
  phaseStartedAt: number;
  blinkObserved: boolean;
  // stability counters
  blinkClosedFrames?: number;
  blinkOpenFrames?: number;
  headConfirmFrames?: number;
  phaseBaselineX?: number;
  lastUpdated: number;
}

const LIVENESS_STEPS = ['Please Blink', 'Turn Head Left', 'Turn Head Right'] as const;
// Tuned thresholds for stability
const BLINK_CLOSE_THRESHOLD = 0.5; // slightly higher to catch real closes
const BLINK_OPEN_THRESHOLD = 0.7; // slightly lower to tolerate partial openings
const BLINK_REQUIRED_CLOSED_FRAMES = 2; // consecutive frames
const BLINK_REQUIRED_OPEN_FRAMES = 2; // consecutive frames after close
const TURN_MOVE_RATIO = 0.14; // smaller ratio to tolerate smaller movements
const HEAD_REQUIRED_CONSECUTIVE = 2; // require sustained turn for stability
const PHASE_TIMEOUT_MS = 6000;
const TOTAL_TIMEOUT_MS = 14000;

class LivenessService {
  private state: LivenessState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): LivenessState {
    const timestamp = Date.now();
    return {
      phase: 'idle',
      prompt: 'Ready for liveness detection',
      step: 0,
      total: LIVENESS_STEPS.length,
      success: false,
      startedAt: timestamp,
      phaseStartedAt: timestamp,
      blinkObserved: false,
      lastUpdated: timestamp,
    };
  }

  reset(): LivenessState {
    const timestamp = Date.now();
    monitoring.incr('livenessAttempts');
    this.state = {
      ...this.createInitialState(),
      phase: 'blink',
      prompt: LIVENESS_STEPS[0],
      step: 1,
      startedAt: timestamp,
      phaseStartedAt: timestamp,
      lastUpdated: timestamp,
      blinkClosedFrames: 0,
      blinkOpenFrames: 0,
      headConfirmFrames: 0,
    };
    console.log('livenessService.reset', this.state);
    return this.getState();
  }

  getState(): LivenessState {
    return { ...this.state };
  }

  update(face?: FaceBounds): LivenessState {
    const now = Date.now();
    if (this.state.phase === 'passed' || this.state.phase === 'failed') {
      return this.getState();
    }

    if (now - this.state.startedAt > TOTAL_TIMEOUT_MS) {
      return this.setFailed('Liveness timeout. Please retry.');
    }

    if (!face) {
      this.state.prompt = `No face detected. ${LIVENESS_STEPS[this.state.step - 1] ?? 'Hold still.'}`;
      this.state.lastUpdated = now;
      return this.getState();
    }

    if (now - this.state.phaseStartedAt > PHASE_TIMEOUT_MS) {
      return this.setFailed('Step timed out. Please try again.');
    }

    switch (this.state.phase) {
      case 'blink':
        return this.updateBlink(face, now);
      case 'headLeft':
        return this.updateHeadTurn(face, 'left', now);
      case 'headRight':
        return this.updateHeadTurn(face, 'right', now);
      default:
        return this.getState();
    }
  }

  private updateBlink(face: FaceBounds, now: number): LivenessState {
    const leftOpen = face.leftEyeOpenProbability;
    const rightOpen = face.rightEyeOpenProbability;
    const hasEyeInfo = typeof leftOpen === 'number' && typeof rightOpen === 'number';

    if (!hasEyeInfo) {
      this.state.prompt = 'Hold your face steady and blink once.';
      this.state.lastUpdated = now;
      return this.getState();
    }

    const eyesClosed = leftOpen < BLINK_CLOSE_THRESHOLD && rightOpen < BLINK_CLOSE_THRESHOLD;
    const eyesOpened = leftOpen > BLINK_OPEN_THRESHOLD && rightOpen > BLINK_OPEN_THRESHOLD;

    // initialize counters
    this.state.blinkClosedFrames = this.state.blinkClosedFrames ?? 0;
    this.state.blinkOpenFrames = this.state.blinkOpenFrames ?? 0;

    if (eyesClosed) {
      this.state.blinkClosedFrames += 1;
      this.state.blinkOpenFrames = 0;
    } else if (eyesOpened) {
      // only count opens after we saw enough closed frames
      if ((this.state.blinkClosedFrames ?? 0) >= BLINK_REQUIRED_CLOSED_FRAMES) {
        this.state.blinkOpenFrames += 1;
      } else {
        // haven't observed a clear close yet, keep prompting
        this.state.blinkOpenFrames = 0;
      }
    } else {
      // neither clear closed nor clearly open; nudge user
      this.state.blinkClosedFrames = 0;
      this.state.blinkOpenFrames = 0;
    }

    if ((this.state.blinkClosedFrames ?? 0) >= BLINK_REQUIRED_CLOSED_FRAMES) {
      this.state.prompt = 'Blink detected, open your eyes now.';
    } else {
      this.state.prompt = 'Please blink once with both eyes.';
    }

    if ((this.state.blinkClosedFrames ?? 0) >= BLINK_REQUIRED_CLOSED_FRAMES && (this.state.blinkOpenFrames ?? 0) >= BLINK_REQUIRED_OPEN_FRAMES) {
      // stable blink observed
      this.state.blinkObserved = true;
      return this.advancePhase(now);
    }

    this.state.lastUpdated = now;
    return this.getState();
  }

  private updateHeadTurn(face: FaceBounds, direction: 'left' | 'right', now: number): LivenessState {
    // establish or smooth baseline
    if (this.state.phaseBaselineX === undefined) {
      this.state.phaseBaselineX = face.centerX;
      this.state.headConfirmFrames = 0;
      this.state.prompt = `Turn your head ${direction} slowly.`;
      this.state.lastUpdated = now;
      return this.getState();
    }

    const offset = face.centerX - this.state.phaseBaselineX;
    const threshold = face.frameWidth * TURN_MOVE_RATIO;
    const meetsLeft = direction === 'left' ? offset > threshold : false;
    const meetsRight = direction === 'right' ? offset < -threshold : false;

    this.state.headConfirmFrames = (this.state.headConfirmFrames ?? 0);
    if (meetsLeft || meetsRight) {
      this.state.headConfirmFrames += 1;
    } else {
      // decay
      this.state.headConfirmFrames = Math.max(0, (this.state.headConfirmFrames ?? 0) - 1);
    }

    if ((this.state.headConfirmFrames ?? 0) >= HEAD_REQUIRED_CONSECUTIVE) {
      return this.advancePhase(now);
    }

    this.state.prompt = direction === 'left'
      ? 'Turn your head left until your face moves right on screen.'
      : 'Turn your head right until your face moves left on screen.';
    this.state.lastUpdated = now;
    return this.getState();
  }

  private advancePhase(now: number): LivenessState {
    if (this.state.step >= LIVENESS_STEPS.length) {
      return this.setPassed(now);
    }

    const nextStep = this.state.step + 1;
    const nextPhase = nextStep === 2 ? 'headLeft' : 'headRight';
    this.state = {
      ...this.state,
      phase: nextPhase,
      prompt: LIVENESS_STEPS[nextStep - 1],
      step: nextStep,
      phaseStartedAt: now,
      blinkObserved: false,
      phaseBaselineX: undefined,
      lastUpdated: now,
    };

    console.log('livenessService.advancePhase', nextPhase, { step: nextStep });
    return this.getState();
  }

  private setPassed(now: number): LivenessState {
    monitoring.incr('livenessPasses');
    this.state = {
      ...this.state,
      phase: 'passed',
      prompt: 'Liveness passed. You may proceed.',
      success: true,
      lastUpdated: now,
    };
    console.log('livenessService.setPassed', this.state);
    return this.getState();
  }

  private setFailed(reason: string): LivenessState {
    this.state = {
      ...this.state,
      phase: 'failed',
      prompt: 'Liveness failed. Try again.',
      success: false,
      failureReason: reason,
      lastUpdated: Date.now(),
    };
    console.warn('livenessService.setFailed', reason);
    return this.getState();
  }
}

const livenessService = new LivenessService();
export default livenessService;
