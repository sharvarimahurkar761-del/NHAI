import livenessService from '../services/livenessService';
import type { FaceBounds } from '../utils/faceDetection';

// Simple helper to feed synthetic face sequences to the liveness service for local testing.
export const runLivenessTest = async () => {
  const baseline: FaceBounds = {
    x: 100, y: 100, width: 200, height: 200, frameWidth: 640, frameHeight: 480, centerX: 200, centerY: 200,
    leftEyeOpenProbability: 0.9, rightEyeOpenProbability: 0.9,
  };

  livenessService.reset();
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  // feed open eyes
  livenessService.update(baseline);
  await sleep(200);

  // closed eyes
  livenessService.update({ ...baseline, leftEyeOpenProbability: 0.1, rightEyeOpenProbability: 0.1 });
  await sleep(200);

  // open eyes
  livenessService.update({ ...baseline, leftEyeOpenProbability: 0.95, rightEyeOpenProbability: 0.95 });
  await sleep(200);

  // turn left
  livenessService.update({ ...baseline, centerX: baseline.centerX + Math.round(baseline.frameWidth * 0.2) });
  await sleep(300);

  // turn right
  livenessService.update({ ...baseline, centerX: baseline.centerX - Math.round(baseline.frameWidth * 0.22) });
  await sleep(300);

  return livenessService.getState();
};
