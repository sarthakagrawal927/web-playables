import type { Platform, Unsubscribe } from "./types";

/**
 * YouTube Playables implementation — a thin wrapper over the `ytgame` SDK.
 * Deliberately uses no Page Visibility API and no localStorage: certification
 * requires pause/resume and saves to flow through the SDK exclusively.
 */
export class YtPlatform implements Platform {
  readonly env = "yt";
  readonly allowsMuteUi = false;
  readonly #sdk: YtGameSdk;

  constructor() {
    if (typeof ytgame === "undefined" || !ytgame) {
      throw new Error("YtPlatform constructed without the ytgame SDK present");
    }
    this.#sdk = ytgame;
  }

  firstFrameReady(): void {
    this.#sdk.game.firstFrameReady();
  }

  gameReady(): void {
    this.#sdk.game.gameReady();
  }

  async loadData(): Promise<string | null> {
    const data = await this.#sdk.game.loadData();
    return data === "" ? null : data;
  }

  saveData(data: string): Promise<void> {
    return this.#sdk.game.saveData(data);
  }

  audioEnabled(): boolean {
    return this.#sdk.system.isAudioEnabled();
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): Unsubscribe {
    // The SDK offers no unsubscribe; callers register once at boot.
    this.#sdk.system.onAudioEnabledChange(cb);
    return () => {};
  }

  onPauseChange(cb: (paused: boolean) => void): Unsubscribe {
    this.#sdk.system.onPause(() => cb(true));
    this.#sdk.system.onResume(() => cb(false));
    return () => {};
  }
}
