import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, useCameraDevices, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { faceDetector } from 'vision-camera-face-detector';

import FaceOverlay from '../components/FaceOverlay';
import * as enrollmentService from '../services/enrollmentService';
import modelService from '../services/modelService';
import faceCropService from '../services/faceCropService';
import { convertNativeFaces, type FaceBounds } from '../utils/faceDetection';
import {
  getFaceCaptureMessage,
  getFaceCapturePlaceholder,
  hasSingleFaceDetected,
} from '../utils/faceCapture';

const EnrollmentScreen = (_props: any) => {
  const camera = useRef<Camera>(null);
  const devices = useCameraDevices();
  const device = devices?.length ? devices[0] : null;
  const [permission, setPermission] = useState<'granted' | 'denied' | 'restricted' | 'not-determined'>('not-determined');
  const [faces, setFaces] = useState<FaceBounds[]>([]);
  const [cameraSize, setCameraSize] = useState({ width: 0, height: 0 });
  const [userName, setUserName] = useState('');
  const [capturedUri, setCapturedUri] = useState('');
  const [capturedEmbedding, setCapturedEmbedding] = useState<number[] | null>(null);
  const [captureStatus, setCaptureStatus] = useState('Waiting for a single face');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const loadPermission = async () => {
      const status = await Camera.getCameraPermissionStatus();
      setPermission(status);
    };

    loadPermission();
  }, []);

  const requestPermission = async () => {
    const status = await Camera.requestCameraPermission();
    setPermission(status);
  };

  const onFacesDetected = useCallback((detectedFaces: FaceBounds[]) => {
    const message = getFaceCaptureMessage(detectedFaces);
    console.log('EnrollmentScreen.onFacesDetected', detectedFaces.length, message);
    setFaces(detectedFaces);
    setCaptureStatus(message);
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const detectedFaces = faceDetector(frame);
    runOnJS(onFacesDetected)(convertNativeFaces(detectedFaces, frame.width, frame.height));
  }, [onFacesDetected]);

  const handleCapture = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!hasSingleFaceDetected(faces)) {
      setErrorMessage(getFaceCaptureMessage(faces));
      return;
    }

    if (!camera.current) {
      setErrorMessage('Camera is not ready. Please try again.');
      return;
    }

    try {
      setCapturing(true);
      const photo = await camera.current.takePhoto({ flash: 'off' } as any);
      const fileUri = photo?.path ?? '';
      console.log('EnrollmentScreen.handleCapture', fileUri);

      if (!fileUri) {
        setErrorMessage('Unable to capture image. Try again.');
        return;
      }

      setCapturedUri(fileUri);
      setSuccessMessage('Face captured successfully. Generating embedding...');

      try {
        let inferencePath = fileUri;
        let cropTimeMs: number | undefined;
        let cropSuccess = false;

        if (faces.length === 1) {
          const cropConfig = faceCropService.getRecommendedConfig('enrollment');
          const cropResult = await faceCropService.cropFaceFromImage(fileUri, faces[0], cropConfig);
          inferencePath = cropResult.croppedImagePath || fileUri;
          cropTimeMs = cropResult.metrics?.cropTimeMs;
          cropSuccess = cropResult.success;

          if (cropSuccess) {
            console.log('EnrollmentScreen.handleCapture cropped face for enrollment', cropResult.metrics);
          } else {
            console.warn('EnrollmentScreen.handleCapture crop failed, using full image', cropResult.error);
          }
        }

        const inferenceResult = await modelService.inferEmbeddingFromImage(inferencePath, {
          isCropped: cropSuccess,
          cropTimeMs,
        });
        setCapturedEmbedding(inferenceResult.embedding ?? null);
        setSuccessMessage('Face captured and embedding generated. Review and save enrollment.');
        console.log('EnrollmentScreen.handleCapture embeddingLen=', inferenceResult.embedding?.length);
      } catch (err) {
        console.error('EnrollmentScreen.handleCapture infer failed', err);
        setCapturedEmbedding(null);
        setErrorMessage('Unable to generate embedding; will save as mock.');
      }
    } catch (error) {
      console.error('EnrollmentScreen.handleCapture', error);
      setErrorMessage('Capture failed. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const handleSaveEnrollment = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (userName.trim().length === 0) {
      setErrorMessage('Enter a name for the enrolled user.');
      return;
    }

    if (!capturedUri) {
      setErrorMessage('Capture a face image before saving.');
      return;
    }

    try {
      setSaving(true);
      const recordId = await enrollmentService.saveEnrollment(userName.trim(), capturedUri, capturedEmbedding ?? undefined);
      console.log('EnrollmentScreen.handleSaveEnrollment saved record', recordId);
      setSuccessMessage(`Enrollment saved locally (#${recordId})`);
      setUserName('');
      setCapturedUri('');
      setFaces([]);
      setCaptureStatus('Waiting for a single face');
    } catch (error) {
      console.error('EnrollmentScreen.handleSaveEnrollment', error);
      setErrorMessage('Unable to save enrollment.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setCapturedUri('');
    setErrorMessage('');
    setSuccessMessage('');
    setCaptureStatus(getFaceCaptureMessage(faces));
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
        <Text style={styles.permissionText}>Camera access is required to enroll a face.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const previewUri = capturedUri.startsWith('file://') ? capturedUri : `file://${capturedUri}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.cameraWrapper} onLayout={(event) => {
          setCameraSize({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          });
        }}>
          {device ? (
            <Camera
              ref={camera}
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

          <FaceOverlay faces={faces} cameraViewSize={cameraSize} statusLabel={captureStatus} />
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.sectionTitle}>Face Enrollment</Text>
          <Text style={styles.sectionBody}>Capture a single clear face image. If more than one face is visible, the capture will be rejected.</Text>
          <Text style={styles.placeholderText}>{getFaceCapturePlaceholder()}</Text>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            style={styles.input}
            placeholder="Enter the user name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {capturedUri ? (
          <View style={styles.previewWrapper}>
            <Text style={styles.previewLabel}>Captured Image</Text>
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.captureButton, styles.buttonSpacing]} onPress={handleCapture} disabled={capturing || saving}>
            <Text style={styles.buttonText}>{capturing ? 'Capturing...' : 'Capture Face'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.captureButton, styles.secondaryButton]} onPress={handleRetake} disabled={capturing || saving}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Retake</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveEnrollment} disabled={saving || capturing}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Enrollment'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
  },
  cameraWrapper: {
    height: 380,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
  },
  cameraLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionBody: {
    color: '#cbd5e1',
    lineHeight: 22,
  },
  placeholderText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 13,
  },
  formRow: {
    marginBottom: 18,
  },
  inputLabel: {
    color: '#cbd5e1',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
  },
  previewWrapper: {
    marginBottom: 16,
  },
  previewLabel: {
    color: '#94a3b8',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#0f172a',
  },
  errorText: {
    color: '#f87171',
    marginBottom: 12,
  },
  successText: {
    color: '#86efac',
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buttonSpacing: {
    marginRight: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  captureButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
  },
  secondaryButtonText: {
    color: '#94a3b8',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  permissionText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 18,
  },
});

export default EnrollmentScreen;
