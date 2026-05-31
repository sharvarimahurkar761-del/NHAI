type Stats = {
  recognitionAttempts: number;
  recognitionSuccesses: number;
  recognitionLowConfidence: number;
  livenessAttempts: number;
  livenessPasses: number;
  s3Uploads: number;
  s3Failures: number;
  lastPerf: Record<string, number>;
};

const stats: Stats = {
  recognitionAttempts: 0,
  recognitionSuccesses: 0,
  recognitionLowConfidence: 0,
  livenessAttempts: 0,
  livenessPasses: 0,
  s3Uploads: 0,
  s3Failures: 0,
  lastPerf: {},
};

export const incr = (key: keyof Stats, by = 1) => {
  if (typeof stats[key] === 'number') {
    // @ts-ignore
    stats[key] = (stats[key] as number) + by;
  }
};

export const setPerf = (label: string, ms: number) => {
  stats.lastPerf[label] = ms;
};

export const getStats = () => ({ ...stats });

export const resetStats = () => {
  stats.recognitionAttempts = 0;
  stats.recognitionSuccesses = 0;
  stats.recognitionLowConfidence = 0;
  stats.livenessAttempts = 0;
  stats.livenessPasses = 0;
  stats.s3Uploads = 0;
  stats.s3Failures = 0;
  stats.lastPerf = {};
};

export default { incr, getStats, resetStats, setPerf };
