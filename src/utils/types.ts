export type Embedding = number[];

export interface AttendanceRecord {
  id: number;
  userId: string;
  timestamp: string;
  synced: number;
}

export interface EnrolledUser {
  id: number;
  userId: string;
  userName: string;
  imageUri: string;
  createdAt: string;
  embedding: Embedding;
}

