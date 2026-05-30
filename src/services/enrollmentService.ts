import { getDBConnection, createTables, closeDatabase } from '../database/database';
import { formatTimestamp } from '../utils/date';
import { serializeEmbedding, deserializeEmbedding, prepareMockEmbedding } from '../utils/embeddingUtils';
import type { EnrolledUser, Embedding } from '../utils/types';

const initDatabase = async () => {
  const db = await getDBConnection();
  await createTables(db);
  return db;
};

export const saveEnrollment = async (
  userName: string,
  imageUri: string,
  embedding?: Embedding,
  userId?: string,
): Promise<number> => {
  const db = await initDatabase();
  const generatedUserId = userId ?? `user-${Date.now()}`;
  const createdAt = formatTimestamp(new Date());
  const embeddingVector = embedding ?? prepareMockEmbedding(imageUri, generatedUserId);
  const embeddingJson = serializeEmbedding(embeddingVector);

  console.log('enrollmentService.saveEnrollment', {
    userId: generatedUserId,
    userName,
    imageUri,
    createdAt,
    embeddingLength: embeddingVector.length,
  });

  const [result] = await db.executeSql(
    'INSERT INTO enrolled_users (userId, userName, imageUri, createdAt, embedding) VALUES (?, ?, ?, ?, ?);',
    [generatedUserId, userName, imageUri, createdAt, embeddingJson],
  );

  const insertId = result.insertId ?? -1;
  await closeDatabase(db);
  return insertId;
};

export const getAllEnrollments = async (): Promise<EnrolledUser[]> => {
  const db = await initDatabase();
  const [results] = await db.executeSql('SELECT * FROM enrolled_users ORDER BY id DESC;');

  const items: EnrolledUser[] = [];
  const rows = results.rows;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows.item(i);
    items.push({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      imageUri: row.imageUri,
      createdAt: row.createdAt,
      embedding: deserializeEmbedding(row.embedding),
    });
  }

  await closeDatabase(db);
  return items;
};
