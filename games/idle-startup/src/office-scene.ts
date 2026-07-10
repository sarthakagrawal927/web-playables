// The office diorama — the game's visual heart, reel-sized. Draws the current
// office tier as a scene, seats the actual team (their real faces), and
// floats coins up from desks while revenue flows. Everything is procedural
// and driven from the render tick, so pausing freezes the whole room.

import { renderAvatar } from "./avatar";
import { OFFICES } from "./content";
import { currentOffice, grossPerSec } from "./sim";
import type { GameState } from "./state";

export interface OfficeScene {
  /** Cheap per-render update; rebuilds only when team/office change. */
  update(state: GameState): void;
}

/** Wall hue + props per office tier, in OFFICES order. */
const TIER_LOOKS = [
  { hue: 30, windows: 1, props: ["🧰", "📦"] }, // garage
  { hue: 200, windows: 3, props: ["🪴", "☕"] }, // coworking
  { hue: 260, windows: 4, props: ["🪴", "🛋️", "☕"] }, // loft
  { hue: 210, windows: 6, props: ["🪴", "🖨️", "☕", "🐟"] }, // office
  { hue: 150, windows: 8, props: ["🌳", "🎱", "☕", "🤖"] }, // campus
  { hue: 280, windows: 12, props: ["🗽", "🚁", "☕", "🏆"] }, // tower
];

/** Desk slots as [left%, top%] — founder gets the first. */
const SLOTS: Array<[number, number]> = [
  [8, 56],
  [24, 62],
  [40, 58],
  [56, 63],
  [72, 57],
  [86, 62],
  [14, 76],
  [30, 80],
  [47, 77],
  [63, 81],
  [79, 77],
  [91, 80],
];

function drawBackdrop(canvas: HTMLCanvasElement, tier: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = 780;
  const h = 400;
  canvas.width = w;
  canvas.height = h;
  const look = TIER_LOOKS[Math.min(tier, TIER_LOOKS.length - 1)] ?? TIER_LOOKS[0];
  if (!look) return;
  const { hue } = look;

  // wall
  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, `hsl(${hue} 30% 16%)`);
  wall.addColorStop(0.62, `hsl(${hue} 26% 11%)`);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h * 0.66);

  // floor
  const floor = ctx.createLinearGradient(0, h * 0.62, 0, h);
  floor.addColorStop(0, `hsl(${hue} 18% 9%)`);
  floor.addColorStop(1, `hsl(${hue} 16% 6%)`);
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  // floorboards
  ctx.strokeStyle = `hsl(${hue} 22% 14%)`;
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const y = h * 0.62 + i * ((h * 0.38) / 5);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // windows with a night skyline glow — more windows, bigger company
  const count = look.windows;
  const winW = Math.min(90, (w - 60) / count - 14);
  const totalW = count * (winW + 14);
  const startX = (w - totalW) / 2 + 7;
  for (let i = 0; i < count; i++) {
    const x = startX + i * (winW + 14);
    const y = h * 0.1;
    const winH = h * 0.34;
    const sky = ctx.createLinearGradient(0, y, 0, y + winH);
    sky.addColorStop(0, `hsl(${(hue + 60) % 360} 45% 26%)`);
    sky.addColorStop(1, `hsl(${(hue + 30) % 360} 50% 14%)`);
    ctx.fillStyle = sky;
    ctx.beginPath();
    ctx.roundRect(x, y, winW, winH, 8);
    ctx.fill();
    ctx.strokeStyle = `hsl(${hue} 25% 22%)`;
    ctx.lineWidth = 3;
    ctx.stroke();
    // city lights
    ctx.fillStyle = "rgba(255, 220, 130, 0.5)";
    for (let d = 0; d < 6; d++) {
      const lx = x + 8 + ((i * 7 + d * 13) % Math.max(8, winW - 16));
      const ly = y + winH * 0.45 + ((d * 17 + i * 5) % (winH * 0.45));
      ctx.fillRect(lx, ly, 3, 3);
    }
  }

  // desks under the seating rows
  ctx.fillStyle = `hsl(${hue} 20% 20%)`;
  for (const [lx, ty] of SLOTS) {
    const x = (lx / 100) * w;
    const y = (ty / 100) * h + 26;
    ctx.beginPath();
    ctx.roundRect(x - 26, y, 52, 9, 4);
    ctx.fill();
  }
}

export function createOfficeScene(host: HTMLElement): OfficeScene {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const backdrop = document.createElement("canvas");
  backdrop.className = "scene-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  const propsLayer = document.createElement("div");
  propsLayer.className = "scene-props";
  const crew = document.createElement("div");
  crew.className = "scene-crew";
  const coins = document.createElement("div");
  coins.className = "scene-coins";
  const sign = document.createElement("div");
  sign.className = "scene-sign";
  host.append(backdrop, propsLayer, crew, coins, sign);

  const COIN_POOL: HTMLSpanElement[] = [];
  let lastTeamLen = -1;
  let lastFounder: number | null = null;
  let lastOffice = -1;
  let coinClock = 0;

  const rebuildCrew = (state: GameState) => {
    crew.textContent = "";
    const seated: Array<{ seed: number; title: string; boss: boolean }> = [];
    if (state.founder !== null) {
      seated.push({ seed: state.founder, title: state.founderName || "Founder", boss: true });
    }
    for (const mate of state.team.slice(-(SLOTS.length - 1))) {
      seated.push({ seed: mate.s, title: mate.n, boss: false });
    }
    seated.forEach((person, i) => {
      const slot = SLOTS[i];
      if (!slot) return;
      const chip = document.createElement("span");
      chip.className = `scene-person${person.boss ? " boss" : ""}`;
      chip.style.left = `${slot[0]}%`;
      chip.style.top = `${slot[1]}%`;
      chip.style.setProperty("--bob-delay", `${(i * 0.37) % 2.2}s`);
      chip.title = person.title;
      renderAvatar(chip, person.seed);
      crew.append(chip);
    });
    const extra = state.team.length - (SLOTS.length - 1);
    if (extra > 0) {
      const more = document.createElement("span");
      more.className = "scene-more";
      more.textContent = `+${extra}`;
      crew.append(more);
    }
  };

  const spawnCoin = () => {
    const coin = COIN_POOL.pop() ?? document.createElement("span");
    coin.className = "scene-coin";
    coin.textContent = "🪙";
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)] ?? [50, 60];
    coin.style.left = `${slot[0] + (Math.random() - 0.5) * 6}%`;
    coin.style.top = `${slot[1]}%`;
    coins.append(coin);
    const anim = coin.animate(
      [
        { transform: "translateY(0) scale(0.7)", opacity: 0 },
        { transform: "translateY(-18px) scale(1)", opacity: 1, offset: 0.25 },
        { transform: `translateY(-${52 + Math.random() * 22}px) scale(0.85)`, opacity: 0 },
      ],
      { duration: 1300 + Math.random() * 500, easing: "ease-out" },
    );
    anim.onfinish = () => {
      coin.remove();
      if (COIN_POOL.length < 12) COIN_POOL.push(coin);
    };
  };

  return {
    update(state: GameState) {
      const officeIdx = Math.min(state.officeIndex, OFFICES.length - 1);
      if (officeIdx !== lastOffice) {
        lastOffice = officeIdx;
        drawBackdrop(backdrop, officeIdx);
        const office = currentOffice(state);
        sign.textContent = `${office.emoji} ${office.name}`;
        propsLayer.textContent = "";
        const look = TIER_LOOKS[officeIdx] ?? TIER_LOOKS[0];
        (look?.props ?? []).forEach((glyph, i) => {
          const prop = document.createElement("span");
          prop.className = "scene-prop";
          prop.textContent = glyph;
          prop.style.left = `${6 + i * 27}%`;
          prop.style.top = "38%";
          propsLayer.append(prop);
        });
      }
      if (state.team.length !== lastTeamLen || state.founder !== lastFounder) {
        lastTeamLen = state.team.length;
        lastFounder = state.founder;
        rebuildCrew(state);
      }
      // coins flow while money does — called at ~10 Hz from the render tick,
      // so hiding the tab freezes the fountain along with the sim
      if (!reducedMotion && grossPerSec(state) > 0) {
        coinClock += 1;
        const cadence = grossPerSec(state) > 50_000 ? 3 : grossPerSec(state) > 5_000 ? 5 : 9;
        if (coinClock % cadence === 0) spawnCoin();
      }
    },
  };
}
