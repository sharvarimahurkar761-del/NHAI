export type EyeProb = {
  left?: number;
  right?: number;
};

export const hasEyeProbabilities = (p: EyeProb) => typeof p.left === 'number' && typeof p.right === 'number';

export const isEyesClosed = (p: EyeProb, threshold = 0.45) => {
  return hasEyeProbabilities(p) && (p.left! < threshold && p.right! < threshold);
};

export const isEyesOpen = (p: EyeProb, threshold = 0.75) => {
  return hasEyeProbabilities(p) && (p.left! > threshold && p.right! > threshold);
};

export default { hasEyeProbabilities, isEyesClosed, isEyesOpen };
