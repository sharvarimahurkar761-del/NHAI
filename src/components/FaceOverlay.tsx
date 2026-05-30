import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FaceBounds } from '../utils/faceDetection';

type FaceOverlayProps = {
  faces: FaceBounds[];
  cameraViewSize: {
    width: number;
    height: number;
  };
  statusLabel: string;
  livenessPhase?: string;
  livenessPassed?: boolean;
};

const FaceOverlay = ({ faces, cameraViewSize, statusLabel, livenessPhase, livenessPassed }: FaceOverlayProps) => {
  const { width: previewWidth, height: previewHeight } = cameraViewSize;
  const hasPreview = previewWidth > 0 && previewHeight > 0;
  const overlayStatus = livenessPhase ? `${statusLabel} · ${livenessPhase}` : statusLabel;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{overlayStatus}</Text>
        {livenessPhase ? <Text style={styles.phaseText}>{livenessPhase}</Text> : null}
      </View>

      {hasPreview && faces.map((face, index) => {
        const scaleX = previewWidth / face.frameWidth || 1;
        const scaleY = previewHeight / face.frameHeight || 1;
        const left = face.x * scaleX;
        const top = face.y * scaleY;
        const width = face.width * scaleX;
        const height = face.height * scaleY;
        const boxColor = livenessPassed ? '#22c55e' : '#38bdf8';

        return (
          <View
            key={`face-box-${index}`}
            style={[
              styles.boundingBox,
              {
                left,
                top,
                width,
                height,
                borderColor: boxColor,
              },
            ]}
          >
            <Text style={styles.boxLabel}>Face</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  statusBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  statusText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 12,
    overflow: 'hidden',
  },
  boxLabel: {
    position: 'absolute',
    top: -22,
    left: 0,
    color: '#ffffff',
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  phaseText: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default FaceOverlay;
