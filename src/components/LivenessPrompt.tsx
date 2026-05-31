import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LivenessPromptProps {
  message: string;
  step: number;
  total: number;
}

const LivenessPrompt = ({ message, step, total }: LivenessPromptProps) => {
  const progress = Math.min(1, Math.max(0, step / total));
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{message}</Text>
      <View style={styles.progressBar}> 
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={[styles.progressEmpty, { flex: 1 - progress }]} />
      </View>
      <Text style={styles.stepText}>Step {step} of {total}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b1220',
    borderRadius: 18,
    padding: 16,
  },
  prompt: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  progressBar: {
    height: 12,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#0f172a',
  },
  progressFill: {
    backgroundColor: '#22c55e',
  },
  progressEmpty: {
    backgroundColor: '#1f2937',
  },
  stepText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 14,
  },
});

export default LivenessPrompt;
