"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  const interval = setInterval(callback, 10000);
  return () => clearInterval(interval);
}

function getSnapshot(): number {
  return Math.floor(Date.now() / 1000);
}

function getServerSnapshot(): number {
  return 0;
}

export function useCurrentTimestamp(): bigint {
  const timestamp = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return BigInt(timestamp);
}
