import * as enrollmentService from './enrollmentService';
import { compareEmbeddings, EMBEDDING_MATCH_THRESHOLD } from '../utils/similarity';
import { prepareMockEmbedding } from '../utils/embeddingUtils';
import type { EnrolledUser, Embedding } from '../utils/types';

export const buildMockEmbedding = (imageUri: string, userId: string): Embedding => {
  return prepareMockEmbedding(imageUri, userId);
};

export const compareEnrollmentEmbeddings = (
  reference: Embedding,
  probe: Embedding,
  threshold = EMBEDDING_MATCH_THRESHOLD,
) => {
  const result = compareEmbeddings(reference, probe, threshold);
  console.log('compareEnrollmentEmbeddings', {
    referenceLength: reference.length,
    probeLength: probe.length,
    similarity: result.similarity,
    isMatch: result.isMatch,
    threshold,
  });
  return result;
};

export const findBestEmbeddingMatch = async (
  probeEmbedding: Embedding,
  threshold = EMBEDDING_MATCH_THRESHOLD,
): Promise<{
  user: EnrolledUser | null;
  similarity: number;
  isMatch: boolean;
}> => {
  const enrollments = await enrollmentService.getAllEnrollments();
  let bestMatch: EnrolledUser | null = null;
  let bestSimilarity = 0;
  let isMatch = false;

  for (const enrollment of enrollments) {
    const result = compareEmbeddings(enrollment.embedding, probeEmbedding, threshold);
    if (result.similarity > bestSimilarity) {
      bestSimilarity = result.similarity;
      bestMatch = enrollment;
      isMatch = result.isMatch;
    }
  }

  console.log('findBestEmbeddingMatch', { bestSimilarity, isMatch, matchedUserId: bestMatch?.userId ?? null });

  return {
    user: bestMatch,
    similarity: bestSimilarity,
    isMatch,
  };
};
