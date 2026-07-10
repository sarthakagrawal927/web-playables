// Live revenue sparkline for the cash card. Purely visual: it is fed from
// the render tick (which halts on platform pause), owns no timers of its own.

export interface RevenueChart {
  /** Feed one revenue/sec sample; redraws. Call from the render tick. */
  push(value: number): void;
}

const CAPACITY = 96;

export function createRevenueChart(canvas: HTMLCanvasElement): RevenueChart {
  const samples: number[] = [];
  const ctx = canvas.getContext("2d");

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return false;
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return true;
  };

  const draw = () => {
    if (!ctx || !resize()) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // faint horizontal gridlines — the metrics-dashboard texture
    ctx.strokeStyle = "rgba(105, 120, 190, 0.14)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (h / 4) * i + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (samples.length < 2) return;
    const max = Math.max(...samples, 1e-6);
    const pad = h * 0.12;
    const stepX = w / (CAPACITY - 1);
    const startX = w - (samples.length - 1) * stepX;
    const yFor = (v: number) => h - pad - (v / max) * (h - pad * 2);

    ctx.beginPath();
    samples.forEach((v, i) => {
      const x = startX + i * stepX;
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // area fill under the line
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, "rgba(62, 224, 137, 0.28)");
    fill.addColorStop(1, "rgba(62, 224, 137, 0)");
    ctx.save();
    ctx.lineTo(startX + (samples.length - 1) * stepX, h);
    ctx.lineTo(startX, h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();

    // the line itself
    ctx.beginPath();
    samples.forEach((v, i) => {
      const x = startX + i * stepX;
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#3ee089";
    ctx.lineWidth = Math.max(2, h / 44);
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(62, 224, 137, 0.55)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // emphasized live endpoint
    const last = samples[samples.length - 1];
    if (last !== undefined) {
      const x = startX + (samples.length - 1) * stepX;
      const y = yFor(last);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, h / 26), 0, Math.PI * 2);
      ctx.fillStyle = "#b8ffd9";
      ctx.shadowColor = "rgba(62, 224, 137, 0.9)";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  return {
    push(value: number) {
      samples.push(value);
      if (samples.length > CAPACITY) samples.shift();
      draw();
    },
  };
}
