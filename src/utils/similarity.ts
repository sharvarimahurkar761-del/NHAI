import type { Embedding } from './types';

const getVectorNorm = (vector: Embedding): number => {
  return Math.sqrt(vector.reduce((total, value) => total + value * value, 0));
};

export const cosineSimilarity = (a: Embedding, b: Embedding): number => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  const dotProduct = a.reduce((total, value, index) => total + value * b[index], 0);
  const normA = getVectorNorm(a);
  const normB = getVectorNorm(b);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

export const compareEmbeddings = (
  reference: Embedding,
  probe: Embedding,
  threshold = 0.7,
) => {
  const similarity = cosineSimilarity(reference, probe);
  return {
    similarity,
    isMatch: similarity >= threshold,
  };
};

export const EMBEDDING_MATCH_THRESHOLD = 0.7;
