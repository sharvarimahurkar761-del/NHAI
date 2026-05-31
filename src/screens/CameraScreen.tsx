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
import DebugOverlay from '../components/DebugOverlay';
import RecognizedCard from '../components/RecognizedCard';
import * as attendanceService from '../services/attendanceService';
import livenessService, { type LivenessState } from '../services/livenessService';
import { convertNativeFaces, getFaceStatusText, type FaceBounds } from '../utils/faceDetection';
import { faceDetector } from 'vision-camera-face-detector';
import recognitionService from '../services/recognitionService';
import modelService from '../services/modelService';
import faceCropService from '../services/faceCropService';
import { setDebug, perf, isDebug } from '../utils/debugHelpers';
import { runLivenessTest } from '../testing/livenessTester';

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
  const [debugMode, setDebugMode] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const prompts = ['Please Blink', 'Turn Head Left', 'Turn Head Right'];
  const [promptIndex, setPromptIndex] = useState(0);
  const [message, setMessage] = useState('Ready for liveness detection');
  const [faceStatus, setFaceStatus] = useState('No Face Found');
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });
  const [recognitionLabel, setRecognitionLabel] = useState('');
  const [_recognizedUser, setRecognizedUser] = useState('');
  const [_recognitionConfidence, setRecognitionConfidence] = useState(0);
  const [recognitionLowConfidence, setRecognitionLowConfidence] = useState(false);
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

  useEffect(() => {
    setDebug(debugMode);
    return () => {
      if (debugMode) setDebug(false);
    };
  }, [debugMode]);

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
      // Reflect prompt and progress to UI
      setMessage(nextState.prompt);
      setPromptIndex(Math.max(0, nextState.step - 1));
      console.log('CameraScreen.livenessState', nextState.phase, nextState.step, nextState.prompt);
    }

    // Throttle recognition calls to avoid excessive comparisons
    const now = Date.now();
    if (detectedFaces.length === 1 && now - lastRecognitionRef.current > 1000 && !capturingRecognition) {
      if (!livenessPassed) {
        setRecognitionLabel('Awaiting liveness verification');
        return;
      }

      // small guard against invalid face records
      const currentFace = detectedFaces[0];
      if (!currentFace || typeof currentFace.centerX !== 'number') {
        console.warn('CameraScreen: invalid face data, skipping recognition');
        return;
      }

      lastRecognitionRef.current = now;

      (async () => {
        if (!cameraRef.current) return;
        setCapturingRecognition(true);
        try {
          if (isDebug()) perf.start('photo');
          const photo = await cameraRef.current.takePhoto({ flash: 'off' } as any);
          if (isDebug()) perf.end('photo');
          const fileUri = photo?.path ?? '';
          if (!fileUri) {
            console.warn('CameraScreen: no photo path from takePhoto');
            setCapturingRecognition(false);
            return;
          }

          // Crop face region for improved accuracy and speed
          console.log('CameraScreen: attempting face crop optimization');
          if (isDebug()) perf.start('crop');
          const cropConfig = faceCropService.getRecommendedConfig('recognition');
          const cropResult = await faceCropService.cropFaceFromImage(fileUri, currentFace, cropConfig);
          if (isDebug()) perf.end('crop');

          const imagePath = cropResult.croppedImagePath || fileUri;
          if (isDebug()) perf.start('infer');
          const inferenceResult = await modelService.inferEmbeddingFromImage(imagePath, {
            isCropped: cropResult.success,
            cropTimeMs: cropResult.metrics?.cropTimeMs,
          });
          if (isDebug()) perf.end('infer');

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

          if (isDebug()) perf.start('recognitionProcess');
          const res = await recognitionService.processEmbedding(inferenceResult.embedding);
          if (isDebug()) perf.end('recognitionProcess');
          if (res && res.isMatch && res.user) {
            setRecognitionLabel(`Recognized: ${res.user.userName} (${res.similarity})`);
            setRecognizedUser(res.user.userName);
            setRecognitionConfidence(res.similarity);
            setRecognitionLowConfidence(false);
          } else if (res && res.lowConfidence && res.user) {
            // low-confidence fallback: show persistent card, but don't auto-mark
            setRecognitionLabel(`Possible: ${res.user.userName} (${res.similarity})`);
            setRecognizedUser(res.user.userName);
            setRecognitionConfidence(res.similarity);
            setRecognitionLowConfidence(true);
          } else if (res && res.user === null) {
            setRecognitionLabel('Unknown Face');
            setRecognizedUser('');
            setRecognitionConfidence(0);
            setRecognitionLowConfidence(false);
          } else {
            setRecognitionLabel(res.reason ?? 'No Match');
            setRecognizedUser('');
            setRecognitionConfidence(res.similarity ?? 0);
            setRecognitionLowConfidence(false);
          }
          setTimeout(() => setRecognitionLabel(''), 3000);
        } catch (err) {
          console.error('CameraScreen.recognition error', err);
        } finally {
          setCapturingRecognition(false);
        }
      })();
    }
  }, [capturingRecognition, livenessStarted, livenessPassed, livenessFailed]);

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
    // initialize liveness service and UI
    const initial = livenessService.reset();
    setLivenessState(initial);
    setLivenessStarted(true);
    setLivenessPassed(false);
    setLivenessFailed(false);
    setPromptIndex(Math.max(0, initial.step - 1));
    setMessage(initial.prompt);

    // wait for liveness to complete (passed or failed)
    const start = Date.now();
    const maxWait = 16000; // guard higher than service timeout
    try {
      await new Promise<void>((resolve) => {
        const iv = setInterval(() => {
          const state = livenessService.getState();
          setLivenessState(state);
          setMessage(state.prompt);
          setPromptIndex(Math.max(0, state.step - 1));
          setLivenessPassed(state.phase === 'passed');
          setLivenessFailed(state.phase === 'failed');
          if (state.phase === 'passed' || state.phase === 'failed' || Date.now() - start > maxWait) {
            clearInterval(iv);
            resolve();
          }
        }, 300);
      });

      const final = livenessService.getState();
      if (final.phase === 'passed') {
        setMessage('Liveness successful ✅');
        try {
          const recordId = await attendanceService.saveAttendance();
          setResult(`Attendance saved locally (#${recordId})`);
        } catch (error) {
          setResult('Unable to save attendance.');
          console.error('CameraScreen.saveAttendance', error);
        }
      } else {
        setMessage(final.failureReason ?? 'Liveness failed. Please try again.');
        setResult('Liveness failed');
      }
    } finally {
      setLoading(false);
      setLivenessStarted(false);
      // reset prompt index after finishing
      setPromptIndex(0);
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

        <FaceOverlay faces={faces} cameraViewSize={cameraSize} statusLabel={recognitionLabel || faceStatus} livenessPhase={livenessState.phase} livenessPassed={livenessPassed} />
      </View>

      <View style={styles.promptArea}>
        <Text style={styles.promptTitle}>Liveness Check</Text>
        <LivenessPrompt message={message} step={promptIndex + 1} total={prompts.length} />

        <TouchableOpacity style={styles.button} onPress={runLivenessFlow} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Running Check...' : 'Start Liveness Flow'}</Text>
        </TouchableOpacity>

        {result.length > 0 && <Text style={styles.result}>{result}</Text>}

        <View style={styles.debugActions}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setDebugMode((value) => !value)}>
            <Text style={styles.buttonText}>{debugMode ? 'Hide Debug Overlay' : 'Show Debug Overlay'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={async () => {
            setTestMode(true);
            const state = await runLivenessTest();
            setMessage(`Test completed: ${state.phase}`);
            setTestMode(false);
          }} disabled={testMode}>
            <Text style={styles.buttonText}>{testMode ? 'Running Test...' : 'Run Liveness Test'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* persistent recognized card */}
      {debugMode ? <DebugOverlay /> : null}

      {_recognizedUser ? (
        <RecognizedCard userName={_recognizedUser} confidence={_recognitionConfidence} marked={!recognitionLowConfidence && result.includes('Attendance saved')} />
      ) : null}

      {/* low-confidence manual controls */}
      {_recognizedUser && recognitionLowConfidence ? (
        <View style={styles.manualArea}>
          <Text style={styles.manualText}>Low-confidence match detected. Confirm attendance manually if this is correct.</Text>
          <View style={styles.manualRow}>
            <TouchableOpacity style={[styles.button, styles.manualButton]} onPress={async () => {
              try {
                setLoading(true);
                const recordId = await attendanceService.saveAttendance();
                setResult(`Attendance saved locally (#${recordId})`);
                setRecognitionLowConfidence(false);
                setTimeout(() => setResult(''), 3000);
              } catch (err) {
                console.error('manual attendance save failed', err);
                setResult('Failed to save attendance');
              } finally {
                setLoading(false);
              }
            }}>
              <Text style={styles.buttonText}>Confirm Attendance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.manualButton, styles.manualDismiss]} onPress={() => {
              setRecognizedUser('');
              setRecognitionLowConfidence(false);
              setRecognitionLabel('');
            }}>
              <Text style={styles.buttonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
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
  secondaryButton: {
    backgroundColor: '#334155',
    marginTop: 12,
  },
  debugActions: {
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
  manualArea: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  manualText: {
    color: '#f8fafc',
    marginBottom: 8,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  manualButton: {
    flex: 1,
  },
  manualDismiss: {
    backgroundColor: '#374151',
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
