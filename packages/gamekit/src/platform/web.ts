import type { Platform, Unsubscribe } from "./types";

/** Browser/iframe implementation: localStorage saves, visibility-based pause. */
export class WebPlatform implements Platform {
  readonly env = "web";
  readonly allowsMuteUi = true;
  readonly #key: string;

  constructor(storageKey: string) {
    this.#key = storageKey;
  }

  firstFrameReady(): void {}
  gameReady(): void {}

  async loadData(): Promise<string | null> {
    try {
      return localStorage.getItem(this.#key);
    } catch {
      // Storage can be unavailable in sandboxed iframes; play without saves.
      return null;
    }
  }

  async saveData(data: string): Promise<void> {
    try {
      localStorage.setItem(this.#key, data);
    } catch {
      // Same sandboxed-iframe caveat: swallow rather than crash the game.
    }
  }

  audioEnabled(): boolean {
    return true;
  }

  onAudioEnabledChange(): Unsubscribe {
    return () => {};
  }

  onPauseChange(cb: (paused: boolean) => void): Unsubscribe {
    const handler = () => cb(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }
}
