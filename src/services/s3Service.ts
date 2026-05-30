import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceRecord } from '../utils/types';

const LAST_SYNC_KEY = 'faceauth_last_sync';

export const uploadAttendanceRecords = async (records: AttendanceRecord[]): Promise<boolean> => {
  console.log('Mock upload to S3:', records.length, 'records');
  await new Promise((resolve) => setTimeout(() => resolve(true), 1800));
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  return true;
};

export const getLastSyncTime = async (): Promise<string | null> => {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
};
