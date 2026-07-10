import { defineConfig } from "vite";

// One entry, two targets: the default build is the embeddable web game; the
// "yt" mode additionally injects the YouTube Playables SDK as the FIRST
// script in <head> (certification requires it to load before game code).
export default defineConfig(({ mode }) => ({
  base: "./",
  build: {
    outDir: mode === "yt" ? "dist/yt" : "dist/web",
    emptyOutDir: true,
    target: "es2022",
  },
  plugins: [
    {
      name: "yt-sdk-inject",
      transformIndexHtml() {
        if (mode !== "yt") return;
        return [
          {
            tag: "script",
            attrs: { src: "https://www.youtube.com/game_api/v1" },
            injectTo: "head-prepend" as const,
          },
        ];
      },
    },
  ],
}));
