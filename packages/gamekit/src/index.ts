export { createEmitter, type Emitter } from "./events";
export { formatDuration, formatNumber } from "./format";
export { createLoop, type Loop, type LoopOptions } from "./loop";
export { DEFAULT_OFFLINE_CAP_SECONDS, elapsedOfflineSeconds } from "./offline";
export { createPlatform, type PlatformOptions } from "./platform/create";
export type { Platform, Unsubscribe } from "./platform/types";
export { WebPlatform } from "./platform/web";
export { YtPlatform } from "./platform/yt";
export {
  createSaveManager,
  type LoadResult,
  MAX_SAVE_BYTES,
  type Migration,
  type SaveEnvelope,
  type SaveManager,
  type SaveManagerOptions,
} from "./save";
