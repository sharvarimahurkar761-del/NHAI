import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import useConnectivity from '../hooks/useConnectivity';
import SyncStatus from '../components/SyncStatus';
import * as attendanceService from '../services/attendanceService';
import * as s3Service from '../services/s3Service';
import { AttendanceRecord } from '../utils/types';

const HomeScreen = ({ navigation }: any) => {
  const isConnected = useConnectivity();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Loading attendance...');

  const refreshAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const allRecords = await attendanceService.getAllAttendance();
      setAttendanceRecords(allRecords);
      setStatusMessage('Attendance history loaded.');
    } catch (error) {
      setStatusMessage('Unable to load attendance.');
      console.error('HomeScreen.refreshAttendance', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncPendingRecords = useCallback(async () => {
    setSyncing(true);
    try {
      const pending = await attendanceService.getPendingAttendance();
      if (pending.length === 0) {
        setStatusMessage('Nothing to sync.');
        return;
      }

      setStatusMessage('Syncing pending attendance...');
      await s3Service.uploadAttendanceRecords(pending);
      await attendanceService.markAsSynced(pending.map((item) => item.id));
      await attendanceService.deleteSyncedRecords();
      setStatusMessage('Pending records synced successfully.');
    } catch (error) {
      setStatusMessage('Sync failed. Retrying when online.');
      console.error('HomeScreen.syncPendingRecords', error);
    } finally {
      setSyncing(false);
      refreshAttendance();
    }
  }, [refreshAttendance]);

  useEffect(() => {
    refreshAttendance();
  }, [refreshAttendance]);

  useEffect(() => {
    if (isConnected && !syncing) {
      syncPendingRecords();
    }
  }, [isConnected, syncing, syncPendingRecords]);

  const pendingCount = attendanceRecords.filter((item) => item.synced === 0).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>FaceAuth Attendance</Text>
          <Text style={styles.subtitle}>Offline-first face recognition system</Text>
        </View>

        <SyncStatus connected={isConnected} pending={pendingCount} syncing={syncing} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live attendance capture</Text>
        <Text style={styles.cardBody}>Use the camera flow to mark attendance, then sync automatically when internet returns.</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.firstButton]} onPress={() => navigation.navigate('Camera')}>
            <Text style={styles.buttonText}>Open Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => navigation.navigate('Enrollment')}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Enroll Face</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#60a5fa" size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={attendanceRecords}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No attendance records stored yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.recordCard, item.synced === 0 && styles.pendingRecord]}>
              <Text style={styles.recordText}>ID: {item.userId}</Text>
              <Text style={styles.recordText}>Timestamp: {item.timestamp}</Text>
              <Text style={styles.recordTag}>{item.synced === 1 ? 'Synced' : 'Pending'}</Text>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshAttendance} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 6,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardBody: {
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 18,
  },
  button: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  firstButton: {
    marginRight: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  statusBar: {
    marginBottom: 16,
  },
  statusText: {
    color: '#cbd5e1',
  },
  list: {
    paddingBottom: 24,
  },
  loader: {
    marginTop: 24,
  },
  recordCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  pendingRecord: {
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  recordText: {
    color: '#e2e8f0',
    marginBottom: 6,
  },
  recordTag: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
  },
  secondaryButtonText: {
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
});

export default HomeScreen;
