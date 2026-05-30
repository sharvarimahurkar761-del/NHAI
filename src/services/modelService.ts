let Tflite: any = null;
try {
  // require optional native dependency
  // using require so this module can be optional during JS-only builds
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // (the rule may be disabled in some configs; keeping comment for clarity)
  // @ts-ignore
  Tflite = require('react-native-tflite');
} catch {
  // library not installed; will fallback to mock
  Tflite = null;
}

import { prepareMockEmbedding } from '../utils/embeddingUtils';

type LoadResult = { success: boolean; message?: string };

const MODEL_ASSET_PATH = 'models/face_embedding.tflite';

export interface InferenceMetrics {
  inputImagePath: string;
  isCropped: boolean;
  imageWidth?: number;
  imageHeight?: number;
  cropTimeMs?: number;
  inferenceTimeMs: number;
  embeddingLength: number;
}

class ModelService {
  private tflite: any;
  private loaded = false;

  constructor() {
    this.tflite = null;
    if (Tflite) {
      this.tflite = new Tflite();
    }
  }

  async loadModel(): Promise<LoadResult> {
    if (!this.tflite) {
      return { success: false, message: 'react-native-tflite not available' };
    }

    if (this.loaded) return { success: true };

    try {
      // Android: model should be placed under android/app/src/main/assets/models/
      await new Promise<void>((resolve, reject) => {
        this.tflite.loadModel({
          model: MODEL_ASSET_PATH,
        }, (err: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
      this.loaded = true;
      console.log('modelService.loadModel loaded');
      return { success: true };
    } catch (error) {
      console.error('modelService.loadModel error', error);
      return { success: false, message: String(error) };
    }
  }

  async unloadModel(): Promise<void> {
    if (!this.tflite || !this.loaded) return;
    try {
      // no explicit unload API in react-native-tflite; keep flag
      this.loaded = false;
      console.log('modelService.unloadModel');
    } catch (error) {
      console.error('modelService.unloadModel error', error);
    }
  }

  /**
   * Generate embedding from image.
   * Cropped images significantly improve accuracy and speed.
   *
   * @param imagePath Path to image (full or cropped)
   * @param options Configuration for inference
   * @returns Embedding array or null on failure
   */
  async inferEmbeddingFromImage(
    imagePath: string,
    options?: { inputSize?: number; isCropped?: boolean; cropTimeMs?: number },
  ): Promise<{ embedding: number[] | null; metrics?: InferenceMetrics }> {
    const start = Date.now();
    const startMetrics = { ...options };

    if (!this.tflite) {
      // fallback to mock embedding for now
      const embedding = prepareMockEmbedding(imagePath, String(start));
      const inferenceTimeMs = Date.now() - start;
      console.log('modelService.inferEmbeddingFromImage (mock) timeMs=', inferenceTimeMs);
      return {
        embedding,
        metrics: {
          inputImagePath: imagePath,
          isCropped: startMetrics.isCropped ?? false,
          cropTimeMs: startMetrics.cropTimeMs,
          inferenceTimeMs,
          embeddingLength: embedding.length,
        },
      };
    }

    if (!this.loaded) {
      const loadRes = await this.loadModel();
      if (!loadRes.success) {
        console.warn('modelService.inferEmbeddingFromImage model not loaded, fallback to mock');
        const embedding = prepareMockEmbedding(imagePath, String(start));
        const inferenceTimeMs = Date.now() - start;
        return {
          embedding,
          metrics: {
            inputImagePath: imagePath,
            isCropped: startMetrics.isCropped ?? false,
            cropTimeMs: startMetrics.cropTimeMs,
            inferenceTimeMs,
            embeddingLength: embedding.length,
          },
        };
      }
    }

    try {
      // runModelOnImage supports image path, specify output as array
      const result: any = await new Promise((resolve, reject) => {
        this.tflite.runModelOnImage({
          path: imagePath,
          imageMean: 128.0,
          imageStd: 128.0,
          numResults: 128,
          threshold: 0.05,
          asynch: true,
        }, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      // The tflite wrapper returns array of predictions; for embedding model,
      // many wrappers return a flattened float array in res; adapt as necessary.
      let embedding: number[] = [];
      if (Array.isArray(result)) {
        // try to find numeric array
        const numeric = result.find((r: any) => Array.isArray(r) && typeof r[0] === 'number');
        if (numeric) embedding = numeric as number[];
      }

      const inferenceTimeMs = Date.now() - start;
      const metrics: InferenceMetrics = {
        inputImagePath: imagePath,
        isCropped: startMetrics.isCropped ?? false,
        cropTimeMs: startMetrics.cropTimeMs,
        inferenceTimeMs,
        embeddingLength: embedding.length,
      };

      console.log('modelService.inferEmbeddingFromImage success', {
        isCropped: metrics.isCropped,
        cropTimeMs: metrics.cropTimeMs,
        inferenceTimeMs: metrics.inferenceTimeMs,
        embeddingLen: embedding.length,
      });

      if (embedding.length === 0) {
        // fallback to mock
        const mockEmbedding = prepareMockEmbedding(imagePath, String(start));
        return { embedding: mockEmbedding, metrics };
      }

      return { embedding, metrics };
    } catch (error) {
      console.error('modelService.inferEmbeddingFromImage error', error);
      const fallbackEmbedding = prepareMockEmbedding(imagePath, String(start));
      const inferenceTimeMs = Date.now() - start;
      return {
        embedding: fallbackEmbedding,
        metrics: {
          inputImagePath: imagePath,
          isCropped: startMetrics.isCropped ?? false,
          cropTimeMs: startMetrics.cropTimeMs,
          inferenceTimeMs,
          embeddingLength: fallbackEmbedding.length,
        },
      };
    }
  }
}

const modelService = new ModelService();
export default modelService;
