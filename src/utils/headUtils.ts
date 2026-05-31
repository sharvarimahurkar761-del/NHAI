import type { FaceBounds } from './faceDetection';

export const computeHorizontalOffset = (face: FaceBounds) => {
  return face.centerX - (face.frameWidth / 2);
};

export const hasSignificantTurn = (face: FaceBounds, ratio = 0.18) => {
  const threshold = face.frameWidth * ratio;
  const offset = computeHorizontalOffset(face);
  return Math.abs(offset) > threshold;
};

export default { computeHorizontalOffset, hasSignificantTurn };
