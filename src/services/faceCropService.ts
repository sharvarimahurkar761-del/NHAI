import { NativeModules, Platform } from 'react-native';
import type { FaceBounds } from '../utils/faceDetection';
import {
  calculateCropBounds,
  validateFaceBounds,
  OPTIMAL_FACE_SIZE,
  type CropConfig,
  type CropResult,
  type CropMetrics,
  formatCropMetrics,
} from '../utils/faceCropUtils';

/**
 * Face Crop Service
 * Handles cropping face regions from photos and resizing for TFLite inference.
 * Optimizes recognition accuracy and inference speed by reducing input size.
 */
class FaceCropService {
  /**
   * Crop face region from image using detected face bounds.
   * On failure, returns full image path as fallback.
   */
  async cropFaceFromImage(imagePath: string, face: FaceBounds, config?: CropConfig): Promise<CropResult> {
    const totalStartTime = Date.now();

    // Validate face bounds
    const validation = validateFaceBounds(face);
    if (!validation.valid) {
      console.warn('faceCropService.cropFaceFromImage validation failed', validation.reason);
      return {
        success: false,
        croppedImagePath: imagePath,
        error: validation.reason,
      };
    }

    const cropStartTime = Date.now();
    const cropBounds = calculateCropBounds(face, config?.paddingRatio ?? 0.2);
    const cropTimeMs = Date.now() - cropStartTime;

    try {
      // Attempt native cropping on Android/iOS
      const croppedPath = await this.performNativeCrop(imagePath, cropBounds, config?.targetSize ?? OPTIMAL_FACE_SIZE);

      const totalTimeMs = Date.now() - totalStartTime;
      const metrics: CropMetrics = {
        originalWidth: face.frameWidth,
        originalHeight: face.frameHeight,
        croppedWidth: cropBounds.width,
        croppedHeight: cropBounds.height,
        resizedWidth: config?.targetSize ?? OPTIMAL_FACE_SIZE,
        resizedHeight: config?.targetSize ?? OPTIMAL_FACE_SIZE,
        cropTimeMs,
        totalTimeMs,
      };

      console.log('faceCropService.cropFaceFromImage success', formatCropMetrics(metrics));

      return {
        success: true,
        croppedImagePath: croppedPath,
        metrics,
      };
    } catch (error) {
      console.error('faceCropService.cropFaceFromImage error', error);

      // Fallback: use original image if cropping fails
      const fallbackMetrics: CropMetrics = {
        originalWidth: face.frameWidth,
        originalHeight: face.frameHeight,
        croppedWidth: face.frameWidth,
        croppedHeight: face.frameHeight,
        resizedWidth: OPTIMAL_FACE_SIZE,
        resizedHeight: OPTIMAL_FACE_SIZE,
        cropTimeMs,
        totalTimeMs: Date.now() - totalStartTime,
      };

      console.warn('faceCropService.cropFaceFromImage fallback to original', String(error));

      return {
        success: false,
        croppedImagePath: imagePath,
        metrics: fallbackMetrics,
        error: String(error),
      };
    }
  }

  /**
   * Perform native image crop and resize operation.
   * Uses RCTImageEditingManager on iOS, equivalent API on Android.
   * Returns path to the cropped/resized image.
   */
  private async performNativeCrop(imagePath: string, cropBounds: { x: number; y: number; width: number; height: number }, targetSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const ImageEditingManager =
        NativeModules.RCTImageEditingManager ||
        NativeModules.ImageEditingManager ||
        NativeModules.ImageEditor ||
        NativeModules.ImageEditorManager;

      if (!ImageEditingManager) {
        console.warn('faceCropService.performNativeCrop image editor module not available, returning original image');
        resolve(imagePath);
        return;
      }

      const cropData = {
        offset: { x: Math.round(cropBounds.x), y: Math.round(cropBounds.y) },
        size: { width: Math.round(cropBounds.width), height: Math.round(cropBounds.height) },
        displaySize: { width: targetSize, height: targetSize },
        resizeMode: 'contain' as const,
      };

      ImageEditingManager.cropImage(
        imagePath,
        cropData,
        (croppedUri: string) => {
          resolve(croppedUri);
        },
        (error: string) => {
          reject(new Error(`crop failed: ${error}`));
        },
      );
    });
  }

  /**
   * Batch crop multiple face detections from a single image.
   * Useful for processing multiple people in a frame.
   */
  async cropMultipleFaces(imagePath: string, faces: FaceBounds[], config?: CropConfig): Promise<Array<CropResult & { faceIndex: number }>> {
    const results = await Promise.all(
      faces.map((face, index) =>
        this.cropFaceFromImage(imagePath, face, config).then((result) => ({
          ...result,
          faceIndex: index,
        })),
      ),
    );

    return results;
  }

  /**
   * Get recommended crop config for specific use case.
   */
  getRecommendedConfig(useCase: 'enrollment' | 'recognition' | 'liveness'): CropConfig {
    const configs: Record<string, CropConfig> = {
      enrollment: {
        paddingRatio: 0.3,
        targetSize: OPTIMAL_FACE_SIZE,
        quality: 95,
      },
      recognition: {
        paddingRatio: 0.2,
        targetSize: OPTIMAL_FACE_SIZE,
        quality: 85,
      },
      liveness: {
        paddingRatio: 0.15,
        targetSize: OPTIMAL_FACE_SIZE,
        quality: 80,
      },
    };

    return configs[useCase] || configs.recognition;
  }
}

const faceCropService = new FaceCropService();
export default faceCropService;
