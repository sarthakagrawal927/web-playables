// Procedural cover art for game cards: a "revenue going up" scene — glowing
// ascending bars under a drifting sun of the game's hue. No image assets;
// every game gets distinctive art from a hue + seed.

export interface CoverOptions {
  hue: number;
  muted?: boolean;
  seed?: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawCover(canvas: HTMLCanvasElement, opts: CoverOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = 640;
  const h = 280;
  canvas.width = w;
  canvas.height = h;
  const { hue } = opts;
  const sat = opts.muted ? 22 : 68;
  const rand = mulberry32(opts.seed ?? 7);

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, `hsl(${hue + 30} ${sat}% 13%)`);
  sky.addColorStop(1, `hsl(${hue} ${sat}% 8%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // sun glow, top right
  const sun = ctx.createRadialGradient(w * 0.78, h * 0.3, 8, w * 0.78, h * 0.3, h * 0.72);
  sun.addColorStop(0, `hsl(${hue} ${sat + 12}% 64% / ${opts.muted ? 0.28 : 0.5})`);
  sun.addColorStop(1, "transparent");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // graph paper
  ctx.strokeStyle = `hsl(${hue} ${sat}% 55% / 0.10)`;
  ctx.lineWidth = 1;
  for (let x = 0.5; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0.5; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // ascending glowing bars
  const bars = 11;
  const gap = 10;
  const bw = (w - gap * (bars + 1)) / bars;
  for (let i = 0; i < bars; i++) {
    const progress = (i + 1) / bars;
    const jitter = 0.75 + rand() * 0.5;
    const bh = Math.min(h * 0.86, h * 0.16 + h * 0.62 * progress * jitter);
    const x = gap + i * (bw + gap);
    const y = h - bh;
    const bar = ctx.createLinearGradient(0, y, 0, h);
    bar.addColorStop(0, `hsl(${hue} ${sat + 8}% 58% / 0.85)`);
    bar.addColorStop(1, `hsl(${hue} ${sat}% 30% / 0.25)`);
    ctx.fillStyle = bar;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, bh, [6, 6, 0, 0]);
    ctx.fill();
    // bright cap
    ctx.fillStyle = `hsl(${hue} ${sat + 20}% ${opts.muted ? 55 : 74}%)`;
    ctx.shadowColor = `hsl(${hue} 90% 60% / 0.9)`;
    ctx.shadowBlur = opts.muted ? 0 : 14;
    ctx.beginPath();
    ctx.roundRect(x, y, bw, 5, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // trend line through the bar tops
  ctx.beginPath();
  for (let i = 0; i < bars; i++) {
    const x = gap + i * (bw + gap) + bw / 2;
    const y = h - (h * 0.16 + h * 0.62 * ((i + 1) / bars)) - 14;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = `hsl(${hue} ${sat + 20}% 78% / ${opts.muted ? 0.3 : 0.8})`;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.setLineDash([1, 0]);
  ctx.stroke();
}
