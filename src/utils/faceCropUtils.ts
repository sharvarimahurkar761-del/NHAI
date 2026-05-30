/**
 * Face crop utilities for optimizing recognition accuracy.
 * Provides helpers for cropping detected face regions from images
 * and validating crop quality before TFLite inference.
 */

// Optimal size for TFLite face embedding models (usually 128x128 or 160x160)
export const OPTIMAL_FACE_SIZE = 128;

// Minimum face size threshold (below this, cropping quality degrades)
export const MIN_FACE_WIDTH = 40;
export const MIN_FACE_HEIGHT = 40;

export interface CropConfig {
  paddingRatio?: number; // 0.2 = 20% padding around face (helps with context)
  targetSize?: number; // Output size (square)
  quality?: number; // JPEG quality 0-100
}

export interface CropMetrics {
  originalWidth: number;
  originalHeight: number;
  croppedWidth: number;
  croppedHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  cropTimeMs: number;
  totalTimeMs: number;
}

export interface CropResult {
  success: boolean;
  croppedImagePath?: string;
  metrics?: CropMetrics;
  error?: string;
}

/**
 * Calculate crop coordinates with optional padding.
 * Ensures crop stays within frame bounds.
 */
import type { FaceBounds } from './faceDetection';

export const calculateCropBounds = (
  face: FaceBounds,
  paddingRatio = 0.2,
): { x: number; y: number; width: number; height: number } => {
  const padding = Math.max(face.width, face.height) * paddingRatio;

  let x = Math.max(0, face.x - padding);
  let y = Math.max(0, face.y - padding);
  let width = Math.min(face.width + 2 * padding, face.frameWidth - x);
  let height = Math.min(face.height + 2 * padding, face.frameHeight - y);

  // Make sure we don't exceed frame boundaries
  if (x + width > face.frameWidth) {
    width = face.frameWidth - x;
  }
  if (y + height > face.frameHeight) {
    height = face.frameHeight - y;
  }

  return { x, y, width, height };
};

/**
 * Validate if face bounds are suitable for cropping.
 */
export const validateFaceBounds = (face: FaceBounds): { valid: boolean; reason?: string } => {
  if (face.width < MIN_FACE_WIDTH || face.height < MIN_FACE_HEIGHT) {
    return {
      valid: false,
      reason: `Face too small: ${Math.round(face.width)}x${Math.round(face.height)} (min: ${MIN_FACE_WIDTH}x${MIN_FACE_HEIGHT})`,
    };
  }

  if (face.width <= 0 || face.height <= 0) {
    return { valid: false, reason: 'Invalid face dimensions' };
  }

  return { valid: true };
};

/**
 * Format crop metrics for logging.
 */
export const formatCropMetrics = (metrics: CropMetrics): string => {
  return [
    `Original: ${metrics.originalWidth}x${metrics.originalHeight}`,
    `Cropped: ${metrics.croppedWidth}x${metrics.croppedHeight}`,
    `Resized: ${metrics.resizedWidth}x${metrics.resizedHeight}`,
    `Crop time: ${metrics.cropTimeMs}ms`,
    `Total time: ${metrics.totalTimeMs}ms`,
  ].join(' | ');
};
