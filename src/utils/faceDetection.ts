import type { Face } from 'vision-camera-face-detector';

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  centerX: number;
  centerY: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
}

export const convertNativeFaces = (faces: Face[] | null, frameWidth: number, frameHeight: number): FaceBounds[] => {
  if (!faces?.length) {
    return [];
  }

  return faces.map((face) => {
    const x = face.bounds.x;
    const y = face.bounds.y;
    const width = face.bounds.width;
    const height = face.bounds.height;

    return {
      x,
      y,
      width,
      height,
      frameWidth,
      frameHeight,
      centerX: x + width / 2,
      centerY: y + height / 2,
      leftEyeOpenProbability: face.leftEyeOpenProbability,
      rightEyeOpenProbability: face.rightEyeOpenProbability,
    };
  });
};

export const getFaceStatusText = (faces: FaceBounds[]) => {
  return faces.length > 0 ? 'Face Detected' : 'No Face Found';
};
