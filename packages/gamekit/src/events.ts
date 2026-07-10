import type { Unsubscribe } from "./platform/types";

export interface Emitter<E extends Record<string, unknown>> {
  on<K extends keyof E>(event: K, cb: (payload: E[K]) => void): Unsubscribe;
  emit<K extends keyof E>(event: K, payload: E[K]): void;
}

export function createEmitter<E extends Record<string, unknown>>(): Emitter<E> {
  const listeners = new Map<keyof E, Set<(payload: unknown) => void>>();
  return {
    on(event, cb) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(cb as (payload: unknown) => void);
      return () => set.delete(cb as (payload: unknown) => void);
    },
    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return;
      for (const cb of set) cb(payload);
    },
  };
}
