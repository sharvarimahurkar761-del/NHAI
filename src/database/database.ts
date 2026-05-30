import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

const databaseName = 'faceauth.db';

export const getDBConnection = async (): Promise<SQLiteDatabase> => {
  return SQLite.openDatabase({ name: databaseName, location: 'default' });
};

export const createTables = async (db: SQLiteDatabase): Promise<void> => {
  const createAttendanceTable = `CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    timestamp TEXT,
    synced INTEGER
  );`;

  const createEnrollmentTable = `CREATE TABLE IF NOT EXISTS enrolled_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT UNIQUE,
    userName TEXT,
    imageUri TEXT,
    createdAt TEXT,
    embedding TEXT
  );`;

  await db.executeSql(createAttendanceTable);
  await db.executeSql(createEnrollmentTable);
};

export const closeDatabase = async (db: SQLiteDatabase): Promise<void> => {
  if (db && db.isOpen()) {
    await db.close();
  }
};
