import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';

import LivenessPrompt from '../components/LivenessPrompt';
import FaceOverlay from '../components/FaceOverlay';
import * as attendanceService from '../services/attendanceService';
import livenessService, { type LivenessState } from '../services/livenessService';
import { convertNativeFaces, getFaceStatusText, type FaceBounds } from '../utils/faceDetection';
import { faceDetector } from 'vision-camera-face-detector';
import recognitionService from '../services/recognitionService';
import modelService from '../services/modelService';
import faceCropService from '../services/faceCropService';

const CameraScreen = () => {
  const devices = useCameraDevices();
  const device = devices?.length ? devices[0] : null;
  const [permission, setPermission] = useState<'granted' | 'denied' | 'restricted' | 'not-determined'>('not-determined');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [faces, setFaces] = useState<FaceBounds[]>([]);
  const [livenessState, setLivenessState] = useState<LivenessState>(livenessService.getState());
  const [livenessStarted, setLivenessStarted] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessFailed, setLivenessFailed] = useState(false);
  const [faceStatus, setFaceStatus] = useState('No Face Found');
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });
  const [recognitionLabel, setRecognitionLabel] = useState('');
  const [_recognizedUser, setRecognizedUser] = useState('');
  const [_recognitionConfidence, setRecognitionConfidence] = useState(0);
  const lastRecognitionRef = React.useRef<number>(0);
  const detectedFacesRef = React.useRef<FaceBounds[]>([]);
  const cameraRef = useRef<Camera | null>(null);
  const [capturingRecognition, setCapturingRecognition] = useState(false);

  useEffect(() => {
    const loadPermission = async () => {
      const status = await Camera.getCameraPermissionStatus();
      setPermission(status);
    };

    loadPermission();
  }, [capturingRecognition]);

  const requestPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setPermission(status);
  };

  const onFacesDetected = useCallback((detectedFaces: FaceBounds[]) => {
    const status = getFaceStatusText(detectedFaces);
    console.log('Face detection result', detectedFaces.length, detectedFaces);
    setFaces(detectedFaces);
    detectedFacesRef.current = detectedFaces;
    setFaceStatus(status);

    if (livenessStarted && !livenessPassed && !livenessFailed) {
      const nextState = livenessService.update(detectedFaces[0]);
      setLivenessState(nextState);
      setLivenessPassed(nextState.phase === 'passed');
      setLivenessFailed(nextState.phase === 'failed');
    }

    // Throttle recognition calls to avoid excessive comparisons
    const now = Date.now();
    if (detectedFaces.length === 1 && now - lastRecognitionRef.current > 1000 && !capturingRecognition) {
      if (!livenessPassed) {
        setRecognitionLabel('Awaiting liveness verification');
        return;
      }

      lastRecognitionRef.current = now;
      const currentFace = detectedFaces[0];

      (async () => {
        if (!cameraRef.current) return;
        setCapturingRecognition(true);
        try {
          const photo = await cameraRef.current.takePhoto({ flash: 'off' } as any);
          const fileUri = photo?.path ?? '';
          if (!fileUri) {
            console.warn('CameraScreen: no photo path from takePhoto');
            setCapturingRecognition(false);
            return;
          }

          // Crop face region for improved accuracy and speed
          console.log('CameraScreen: attempting face crop optimization');
          const cropConfig = faceCropService.getRecommendedConfig('recognition');
          const cropResult = await faceCropService.cropFaceFromImage(fileUri, currentFace, cropConfig);

          const imagePath = cropResult.croppedImagePath || fileUri;
          const inferenceResult = await modelService.inferEmbeddingFromImage(imagePath, {
            isCropped: cropResult.success,
            cropTimeMs: cropResult.metrics?.cropTimeMs,
          });

          if (!inferenceResult.embedding || inferenceResult.embedding.length === 0) {
            setRecognitionLabel('Recognition failed');
            setTimeout(() => setRecognitionLabel(''), 2000);
            setCapturingRecognition(false);
            return;
          }

          if (cropResult.success && cropResult.metrics) {
            const sizeReduction = Math.round(((cropResult.metrics.originalWidth * cropResult.metrics.originalHeight) / (cropResult.metrics.resizedWidth * cropResult.metrics.resizedHeight)) * 100);
            console.log('CameraScreen: face cropping reduced image size by', sizeReduction + '%');
          }

          const res = await recognitionService.processEmbedding(inferenceResult.embedding);
          if (res && res.isMatch && res.user) {
            setRecognitionLabel(`Recognized: ${res.user.userName} (${res.similarity})`);
            setRecognizedUser(res.user.userName);
            setRecognitionConfidence(res.similarity);
          } else if (res && res.user === null) {
            setRecognitionLabel('Unknown Face');
            setRecognizedUser('');
            setRecognitionConfidence(0);
          } else {
            setRecognitionLabel(res.reason ?? 'No Match');
            setRecognizedUser('');
            setRecognitionConfidence(res.similarity ?? 0);
          }
          setTimeout(() => setRecognitionLabel(''), 3000);
        } catch (err) {
          console.error('CameraScreen.recognition error', err);
        } finally {
          setCapturingRecognition(false);
        }
      })();
    }
  }, [capturingRecognition]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    const detectedFaces = faceDetector(frame);
    runOnJS(onFacesDetected)(convertNativeFaces(detectedFaces, frame.width, frame.height));
  }, [onFacesDetected]);

  const runLivenessFlow = async () => {
    if (permission !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to continue.');
      return;
    }

    setLoading(true);
    setResult('');
    setPromptIndex(0);
    setMessage(prompts[0]);

    for (let index = 0; index < prompts.length; index += 1) {
      setPromptIndex(index);
      setMessage(prompts[index]);
      // Mock detection delay while the real-time detection runs in the background
      await new Promise((resolve) => setTimeout(() => resolve(true), 2400));
    }

    try {
      const recordId = await attendanceService.saveAttendance();
      setResult(`Attendance saved locally (#${recordId})`);
      setMessage('Liveness successful ✅');
    } catch (error) {
      setResult('Unable to save attendance.');
      console.error('CameraScreen.saveAttendance', error);
    } finally {
      setLoading(false);
    }
  };

  if (permission === 'restricted') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.permissionText}>Checking camera permission...</Text>
        <ActivityIndicator color="#60a5fa" size="large" />
      </SafeAreaView>
    );
  }

  if (permission !== 'granted') {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.permissionText}>Camera access is required.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraWrapper} onLayout={(event) => {
        setCameraSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        });
      }}>
        {device ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            photo
            frameProcessor={frameProcessor}
            {...({ frameProcessorFps: 8 } as any)}
          />
        ) : (
          <View style={styles.cameraLoading}>
            <ActivityIndicator color="#60a5fa" size="large" />
            <Text style={styles.permissionText}>Loading camera...</Text>
          </View>
        )}

        <FaceOverlay faces={faces} cameraViewSize={cameraSize} statusLabel={recognitionLabel || faceStatus} />
      </View>

      <View style={styles.promptArea}>
        <Text style={styles.promptTitle}>Liveness Check</Text>
        <LivenessPrompt message={message} step={promptIndex + 1} total={prompts.length} />

        <TouchableOpacity style={styles.button} onPress={runLivenessFlow} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Running Check...' : 'Start Liveness Flow'}</Text>
        </TouchableOpacity>

        {result.length > 0 && <Text style={styles.result}>{result}</Text>}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 20,
    margin: 16,
    overflow: 'hidden',
  },
  cameraLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptArea: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  promptTitle: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  permissionText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  result: {
    color: '#a7f3d0',
    marginTop: 14,
    fontSize: 16,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

export default CameraScreen;
