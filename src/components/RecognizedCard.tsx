import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  userName: string;
  confidence: number; // 0..1
  marked?: boolean;
};

const RecognizedCard = ({ userName, confidence, marked }: Props) => {
  const pct = Math.round(confidence * 100);
  return (
    <View style={styles.card} pointerEvents="none">
      <View style={styles.left} />
      <View style={styles.body}>
        <Text style={styles.name}>{userName}</Text>
        <Text style={styles.confidence}>{pct}% confidence</Text>
        {marked ? <Text style={styles.marked}>Attendance saved ✅</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 26,
    left: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.9)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#60a5fa',
    alignItems: 'center',
  },
  left: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0ea5a9',
    marginRight: 12,
  },
  body: {},
  name: { color: '#e2e8f0', fontWeight: '800', fontSize: 16 },
  confidence: { color: '#94a3b8', marginTop: 4 },
  marked: { color: '#86efac', marginTop: 6, fontWeight: '700' },
});

export default RecognizedCard;
