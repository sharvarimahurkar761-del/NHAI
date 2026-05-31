import * as embeddingService from './embeddingService';
import * as attendanceService from './attendanceService';
import { generateMockEmbedding } from '../utils/embeddingUtils';
import { EMBEDDING_MATCH_THRESHOLD } from '../utils/similarity';
import monitoring from './monitoringService';
import { perf, isDebug } from '../utils/debugHelpers';
import type { FaceBounds } from '../utils/faceDetection';
import type { Embedding, EnrolledUser } from '../utils/types';

const DEFAULT_COOLDOWN_SECONDS = 60;
// Recognition tuning thresholds
const LOW_CONFIDENCE_THRESHOLD = 0.55; // below this: no match
const HIGH_CONFIDENCE_THRESHOLD = 0.75; // above this: auto-mark attendance

const parseTimestamp = (ts?: string | null) => {
  if (!ts) return null;
  try {
    // Convert 'YYYY-MM-DD hh:mm:ss' into a parsable ISO by inserting 'T'
    const iso = ts.indexOf('T') >= 0 ? ts : ts.replace(' ', 'T');
    return new Date(iso);
  } catch {
    return null;
  }
};

export const buildProbeEmbeddingFromFace = (face: FaceBounds): Embedding => {
  const seed = `${face.frameWidth}x${face.frameHeight}_${Math.round(face.x)}_${Math.round(face.y)}_${Math.round(face.width)}_${Math.round(face.height)}`;
  return generateMockEmbedding(seed);
};

export const processDetectedFace = async (face: FaceBounds, cooldownSeconds = DEFAULT_COOLDOWN_SECONDS) => {
  try {
    const probe = buildProbeEmbeddingFromFace(face);

    if (isDebug()) perf.start('findBestEmbeddingMatch');
    const { user, similarity, isMatch } = await embeddingService.findBestEmbeddingMatch(probe, EMBEDDING_MATCH_THRESHOLD);
    if (isDebug()) perf.end('findBestEmbeddingMatch');

    let result: {
      isMatch: boolean;
      similarity: number;
      user: EnrolledUser | null;
      attendanceMarked: boolean;
      lowConfidence?: boolean;
      reason?: string;
    } = {
      isMatch,
      similarity: Math.round(similarity * 100) / 100,
      user,
      attendanceMarked: false,
    };

    if (!user) {
      result.reason = 'No enrolled users available';
      console.log('recognitionService.processDetectedFace no user', result.similarity);
      return result;
    }
+    monitoring.incr('recognitionAttempts');

    // low / high confidence handling
    if (similarity < LOW_CONFIDENCE_THRESHOLD) {
      result.isMatch = false;
      result.reason = 'Low similarity';
      console.log('recognitionService.processDetectedFace low similarity', result.similarity);
      return result;
    }

    if (similarity < HIGH_CONFIDENCE_THRESHOLD) {
      // between low and high: low-confidence fallback
      result.isMatch = false;
      result.lowConfidence = true;
      result.reason = 'Low-confidence match';
      monitoring.incr('recognitionLowConfidence');
      console.log('recognitionService.processDetectedFace low-confidence', result.similarity);
      return result;
    }

    // Check recent attendance for this user to prevent duplicates
    const all = await attendanceService.getAllAttendance();
    const userRecords = all.filter((r) => r.userId === user.userId).sort((a, b) => (a.id < b.id ? 1 : -1));
    const last = userRecords.length > 0 ? userRecords[0] : null;
    const now = new Date();

    if (last && last.timestamp) {
      const lastDate = parseTimestamp(last.timestamp);
      if (lastDate) {
        const diffSec = (now.getTime() - lastDate.getTime()) / 1000;
        if (diffSec < cooldownSeconds) {
          result.reason = `Duplicate blocked (last ${Math.round(diffSec)}s)`;
          console.log('recognitionService.processDetectedFace blocked duplicate', { userId: user.userId, diffSec });
          return result;
        }
      }
    }

    // Mark attendance for matched user
    // High confidence: proceed with attendance
    try {
      const recordId = await attendanceService.saveAttendance(user.userId);
      result.attendanceMarked = true;
      monitoring.incr('recognitionSuccesses');
      console.log('recognitionService.processDetectedFace attendance saved', { userId: user.userId, recordId });
    } catch (err) {
      console.error('recognitionService.processDetectedFace saveAttendance failed', err);
      result.reason = 'Failed to mark attendance';
    }

    return result;
  } catch (error) {
    console.error('recognitionService.processDetectedFace error', error);
    return { isMatch: false, similarity: 0, user: null, attendanceMarked: false, reason: 'Error' };
  }
};

export const processEmbedding = async (probe: Embedding, cooldownSeconds = DEFAULT_COOLDOWN_SECONDS) => {
  try {
    const { user, similarity, isMatch } = await embeddingService.findBestEmbeddingMatch(probe, EMBEDDING_MATCH_THRESHOLD);

    let result: {
      isMatch: boolean;
      similarity: number;
      user: EnrolledUser | null;
      attendanceMarked: boolean;
      lowConfidence?: boolean;
      reason?: string;
    } = {
      isMatch,
      similarity: Math.round(similarity * 100) / 100,
      user,
      attendanceMarked: false,
    };

    if (!user) {
      result.reason = 'No enrolled users available';
      console.log('recognitionService.processEmbedding no user', result.similarity);
      return result;
    }

    if (similarity < LOW_CONFIDENCE_THRESHOLD) {
      result.isMatch = false;
      result.reason = 'Low similarity';
      console.log('recognitionService.processEmbedding low similarity', result.similarity);
      return result;
    }

    if (similarity < HIGH_CONFIDENCE_THRESHOLD) {
      result.isMatch = false;
      result.lowConfidence = true;
      result.reason = 'Low-confidence match';
      console.log('recognitionService.processEmbedding low-confidence', result.similarity);
      return result;
    }

    // Check recent attendance for this user to prevent duplicates
    const all = await attendanceService.getAllAttendance();
    const userRecords = all.filter((r) => r.userId === user.userId).sort((a, b) => (a.id < b.id ? 1 : -1));
    const last = userRecords.length > 0 ? userRecords[0] : null;
    const now = new Date();

    if (last && last.timestamp) {
      const lastDate = parseTimestamp(last.timestamp);
      if (lastDate) {
        const diffSec = (now.getTime() - lastDate.getTime()) / 1000;
        if (diffSec < cooldownSeconds) {
          result.reason = `Duplicate blocked (last ${Math.round(diffSec)}s)`;
          console.log('recognitionService.processEmbedding blocked duplicate', { userId: user.userId, diffSec });
          return result;
        }
      }
    }

    // Mark attendance for matched user
    try {
      const recordId = await attendanceService.saveAttendance(user.userId);
      result.attendanceMarked = true;
      console.log('recognitionService.processEmbedding attendance saved', { userId: user.userId, recordId });
    } catch (err) {
      console.error('recognitionService.processEmbedding saveAttendance failed', err);
      result.reason = 'Failed to mark attendance';
    }

    return result;
  } catch (error) {
    console.error('recognitionService.processEmbedding error', error);
    return { isMatch: false, similarity: 0, user: null, attendanceMarked: false, reason: 'Error' };
  }
};

export default {
  processDetectedFace,
  processEmbedding,
  buildProbeEmbeddingFromFace,
};
