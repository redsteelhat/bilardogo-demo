'use client';
import { useEffect, useState } from 'react';

/** Belirli aralıklarla güncellenen "şimdi" (sayaçlar için). */
export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
  return now;
}
