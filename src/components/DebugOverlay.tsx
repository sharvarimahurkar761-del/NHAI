import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import monitoring from '../services/monitoringService';

const DebugOverlay = () => {
  const [stats, setStats] = useState(monitoring.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(monitoring.getStats());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.title}>Debug Overlay</Text>
      <Text style={styles.item}>Rec Attempts: {stats.recognitionAttempts}</Text>
      <Text style={styles.item}>Rec Successes: {stats.recognitionSuccesses}</Text>
      <Text style={styles.item}>Low Conf: {stats.recognitionLowConfidence}</Text>
      <Text style={styles.item}>Liveness Attempts: {stats.livenessAttempts}</Text>
      <Text style={styles.item}>Liveness Passes: {stats.livenessPasses}</Text>
      <Text style={styles.item}>S3 Uploads: {stats.s3Uploads}</Text>
      <Text style={styles.item}>S3 Failures: {stats.s3Failures}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: 'rgba(2,6,23,0.9)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#60a5fa',
    zIndex: 1000,
  },
  title: { color: '#e2e8f0', fontWeight: '800', marginBottom: 6 },
  item: { color: '#cbd5e1', fontSize: 12 },
});

export default DebugOverlay;
