/// <reference path="./ytgame.d.ts" />
import type { Platform } from "./types";
import { WebPlatform } from "./web";
import { YtPlatform } from "./yt";

export interface PlatformOptions {
  /** localStorage key for the web fallback, e.g. "save:idle-startup". */
  storageKey: string;
}

/** Picks YtPlatform inside YouTube Playables, WebPlatform everywhere else. */
export function createPlatform(opts: PlatformOptions): Platform {
  if (typeof ytgame !== "undefined" && ytgame?.IN_PLAYABLES_ENV) {
    return new YtPlatform();
  }
  return new WebPlatform(opts.storageKey);
}
