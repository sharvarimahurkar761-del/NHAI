import { getDBConnection, createTables, closeDatabase } from '../database/database';
import { formatTimestamp } from '../utils/date';
import { AttendanceRecord } from '../utils/types';

const initDatabase = async () => {
  const db = await getDBConnection();
  await createTables(db);
  return db;
};

export const saveAttendance = async (userId = 'user-001'): Promise<number> => {
  const db = await initDatabase();
  const timestamp = formatTimestamp(new Date());
  try {
    const [result] = await db.executeSql(
      'INSERT INTO attendance (userId, timestamp, synced) VALUES (?, ?, ?);',
      [userId, timestamp, 0],
    );
    const insertId = result.insertId ?? -1;
    console.log('attendanceService.saveAttendance saved', { userId, insertId });
    return insertId;
  } catch (err) {
    console.error('attendanceService.saveAttendance error', err);
    throw err;
  } finally {
    await closeDatabase(db);
  }
};

export const getPendingAttendance = async (): Promise<AttendanceRecord[]> => {
  const db = await initDatabase();
  const [results] = await db.executeSql(
    'SELECT * FROM attendance WHERE synced = 0 ORDER BY id ASC;',
  );

  const items: AttendanceRecord[] = [];
  const rows = results.rows;
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rows.item(i));
  }

  await closeDatabase(db);
  console.log('attendanceService.getPendingAttendance count=', items.length);
  return items;
};

export const getAllAttendance = async (): Promise<AttendanceRecord[]> => {
  const db = await initDatabase();
  const [results] = await db.executeSql('SELECT * FROM attendance ORDER BY id DESC;');

  const items: AttendanceRecord[] = [];
  const rows = results.rows;
  for (let i = 0; i < rows.length; i += 1) {
    items.push(rows.item(i));
  }

  await closeDatabase(db);
  console.log('attendanceService.getAllAttendance count=', items.length);
  return items;
};

export const markAsSynced = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const db = await initDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.executeSql(
    `UPDATE attendance SET synced = 1 WHERE id IN (${placeholders});`,
    ids,
  );
  await closeDatabase(db);
};

export const deleteSyncedRecords = async (): Promise<void> => {
  const db = await initDatabase();
  await db.executeSql('DELETE FROM attendance WHERE synced = 1;');
  await closeDatabase(db);
};
