// Minimal ambient typing for the YouTube Playables SDK, which is loaded as a
// plain script tag (https://www.youtube.com/game_api/v1) before game code.
// Only the surface gamekit calls is declared.

interface YtGameSdk {
  readonly IN_PLAYABLES_ENV: boolean;
  readonly SDK_VERSION: string;
  game: {
    firstFrameReady(): void;
    gameReady(): void;
    /** Resolves the empty string when no save exists. */
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
    sendScore(score: { value: number }): Promise<void>;
  };
  system: {
    isAudioEnabled(): boolean;
    onAudioEnabledChange(cb: (enabled: boolean) => void): void;
    onPause(cb: () => void): void;
    onResume(cb: () => void): void;
  };
}

declare const ytgame: YtGameSdk | undefined;
