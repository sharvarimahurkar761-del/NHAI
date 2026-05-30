import type { FaceBounds } from '../utils/faceDetection';

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
  phaseBaselineX?: number;
  lastUpdated: number;
}

const LIVENESS_STEPS = ['Please Blink', 'Turn Head Left', 'Turn Head Right'] as const;
const BLINK_CLOSE_THRESHOLD = 0.45;
const BLINK_OPEN_THRESHOLD = 0.75;
const TURN_MOVE_RATIO = 0.18;
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
    this.state = {
      ...this.createInitialState(),
      phase: 'blink',
      prompt: LIVENESS_STEPS[0],
      step: 1,
      startedAt: timestamp,
      phaseStartedAt: timestamp,
      lastUpdated: timestamp,
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

    if (eyesClosed) {
      this.state.blinkObserved = true;
      this.state.prompt = 'Blink detected, open your eyes now.';
    }

    if (this.state.blinkObserved && eyesOpened) {
      return this.advancePhase(now);
    }

    if (!this.state.blinkObserved) {
      this.state.prompt = 'Please blink once with both eyes.';
    }

    this.state.lastUpdated = now;
    return this.getState();
  }

  private updateHeadTurn(face: FaceBounds, direction: 'left' | 'right', now: number): LivenessState {
    if (this.state.phaseBaselineX === undefined) {
      this.state.phaseBaselineX = face.centerX;
      this.state.prompt = `Turn your head ${direction} slowly.`;
      this.state.lastUpdated = now;
      return this.getState();
    }

    const offset = face.centerX - this.state.phaseBaselineX;
    const threshold = face.frameWidth * TURN_MOVE_RATIO;
    const turnedLeft = direction === 'left' ? offset > threshold : false;
    const turnedRight = direction === 'right' ? offset < -threshold : false;

    if ((direction === 'left' && turnedLeft) || (direction === 'right' && turnedRight)) {
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
