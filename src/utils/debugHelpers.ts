export const setDebug = (enabled: boolean) => {
  (globalThis as any).__APP_DEBUG__ = !!enabled;
  console.log('debugHelpers.setDebug', !!enabled);
};

export const isDebug = () => !!(globalThis as any).__APP_DEBUG__;

export const perf = {
  start(label: string) {
    if (!isDebug()) return;
    (globalThis as any)[`__perf_${label}`] = Date.now();
  },
  end(label: string) {
    if (!isDebug()) return;
    const start = (globalThis as any)[`__perf_${label}`];
    if (!start) return;
    const dur = Date.now() - start;
    console.log(`perf:${label}`, dur + 'ms');
    delete (globalThis as any)[`__perf_${label}`];
  },
};
