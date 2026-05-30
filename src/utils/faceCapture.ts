import type { FaceBounds } from './faceDetection';

export const hasSingleFaceDetected = (faces: FaceBounds[]) => faces.length === 1;

export const getFaceCaptureMessage = (faces: FaceBounds[]) => {
  if (faces.length === 0) {
    return 'No face found. Please position one face clearly in view.';
  }

  if (faces.length > 1) {
    return 'Multiple faces detected. Only enroll one person at a time.';
  }

  return 'One face detected. Hold still and capture.';
};

export const getFaceCapturePlaceholder = () => 'Blur detection placeholder active. Keep your face sharp and well lit.';
