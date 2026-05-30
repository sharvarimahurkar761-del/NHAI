declare module 'vision-camera-face-detector' {
  import type { Frame } from 'react-native-vision-camera';

  export interface FaceBounds {
    x: number;
    y: number;
    width: number;
    height: number;
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
  }

  export interface Face {
    bounds: FaceBounds;
    trackingId?: number;
    smilingProbability?: number;
    leftEyeOpenProbability?: number;
    rightEyeOpenProbability?: number;
  }

  export function faceDetector(frame: Frame): Face[] | null;
}
