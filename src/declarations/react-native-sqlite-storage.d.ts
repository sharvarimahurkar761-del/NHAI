declare module 'react-native-sqlite-storage' {
  export interface SQLiteDatabase {
    executeSql(sql: string, params?: any[]): Promise<any[]>;
    close(): Promise<void>;
    isOpen(): boolean;
  }

  export interface SQLiteDatabaseConfig {
    name: string;
    location: string;
  }

  export interface SQLiteStorage {
    DEBUG(value: boolean): void;
    enablePromise(value: boolean): void;
    openDatabase(config: SQLiteDatabaseConfig): Promise<SQLiteDatabase>;
  }

  const SQLite: SQLiteStorage;
  export default SQLite;
}
