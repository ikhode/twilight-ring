import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api';

/**
 * Utility class for facial recognition operations using @vladmandic/face-api
 */
export class FaceApiService {
    private static instance: FaceApiService;
    private isModelsLoaded: boolean = false;
    private loadingPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance(): FaceApiService {
        if (!FaceApiService.instance) {
            FaceApiService.instance = new FaceApiService();
        }
        return FaceApiService.instance;
    }

    /**
     * Loads the face-api models from the public directory
     */
    public async loadModels(): Promise<void> {
        if (this.isModelsLoaded) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            try {
                // Suppress Tensor registration warnings
                tf.env().set('DEBUG', false);

                console.log('[FaceID] Waiting for TensorFlow.js to be ready...');
                await tf.ready();
                console.log('[FaceID] TensorFlow.js is ready. Backend:', tf.getBackend());

                console.log('[FaceID] Loading models using @vladmandic/face-api...');
                // Path relative to public root
                const MODEL_URL = '/models';

                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);

                this.isModelsLoaded = true;
                console.log('[FaceID] Models loaded successfully.');
            } catch (error) {
                console.error('[FaceID] Error loading models:', error);
                this.loadingPromise = null;
                throw error;
            }
        })();

        return this.loadingPromise;
    }

    /**
     * Detects a face and returns its descriptor (128d vector)
     * @param input HTMLVideoElement or HTMLImageElement
     */
    public async getFaceDescriptor(
        input: HTMLVideoElement | HTMLImageElement
    ): Promise<Float32Array | null> {
        await this.loadModels();

        // SSD Mobilenet V1 is more robust than TinyFaceDetector for initial enrollment
        const detection = await faceapi
            .detectSingleFace(input, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            return null;
        }

        return detection.descriptor;
    }

    /**
     * Helper to convert Float32Array to standard number array for JSON storage
     */
    public descriptorToArray(descriptor: Float32Array): number[] {
        return Array.from(descriptor);
    }

    /**
     * Helper to convert number array back to Float32Array
     */
    public arrayToDescriptor(array: number[]): Float32Array {
        return new Float32Array(array);
    }
}

export const faceApiService = FaceApiService.getInstance();
