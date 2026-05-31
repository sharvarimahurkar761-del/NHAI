import type { Embedding } from './types';

const DEFAULT_EMBEDDING_SIZE = 128;

// Embeddings are expected to be normalized, fixed-length vectors.
// The default model target is 128 dimensions. If a teammate uses a different model,
// update this constant and the matching logic in similarity.ts accordingly.
export const createEmbeddingSeed = (imageUri: string, userId: string): string => {
  return `${userId}:${imageUri}`;
};

export const generateMockEmbedding = (seed: string, length = DEFAULT_EMBEDDING_SIZE): Embedding => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000000007;
  }

  const embedding: Embedding = [];
  let value = hash;

  for (let i = 0; i < length; i += 1) {
    value = (value * 1664525 + 1013904223) % 0x100000000;
    embedding.push(((value / 0x100000000) * 2) - 1);
  }

  return embedding;
};

export const serializeEmbedding = (embedding: Embedding): string => {
  return JSON.stringify(embedding);
};

export const deserializeEmbedding = (value?: string | null): Embedding => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => Number(item)) : [];
  } catch (error) {
    console.error('deserializeEmbedding failed', error);
    return [];
  }
};

export const prepareMockEmbedding = (imageUri: string, userId: string): Embedding => {
  const seed = createEmbeddingSeed(imageUri, userId);
  return generateMockEmbedding(seed);
};
