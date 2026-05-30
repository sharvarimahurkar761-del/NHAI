import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SyncStatusProps {
  connected: boolean;
  pending: number;
  syncing: boolean;
}

const SyncStatus = ({ connected, pending, syncing }: SyncStatusProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.connection}>{connected ? 'Online' : 'Offline'}</Text>
      <Text style={styles.pending}>{pending} pending</Text>
      <Text style={styles.sync}>{syncing ? 'Syncing...' : 'Idle'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  connection: {
    color: '#c7d2fe',
    fontWeight: '700',
    marginBottom: 4,
  },
  pending: {
    color: '#d1d5db',
    marginBottom: 4,
  },
  sync: {
    color: '#86efac',
  },
});

export default SyncStatus;
