// The office diorama — the game's visual heart, reel-sized. Draws the current
// office tier as a scene, seats the actual team (their real faces), and
// floats coins up from desks while revenue flows. Everything is procedural
// and driven from the render tick, so pausing freezes the whole room.

import { renderAvatar } from "./avatar";
import { OFFICES } from "./content";
import { pic } from "./img";
import office0 from "./scenes/office-0.jpg";
import office1 from "./scenes/office-1.jpg";
import office2 from "./scenes/office-2.jpg";
import office3 from "./scenes/office-3.jpg";
import office4 from "./scenes/office-4.jpg";
import office5 from "./scenes/office-5.jpg";
import { currentOffice, grossPerSec } from "./sim";
import type { GameState } from "./state";

const BACKDROPS = [office0, office1, office2, office3, office4, office5];

export interface OfficeScene {
  /** Cheap per-render update; rebuilds only when team/office change. */
  update(state: GameState): void;
}

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

export function createOfficeScene(host: HTMLElement): OfficeScene {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const backdrop = document.createElement("img");
  backdrop.className = "scene-backdrop";
  backdrop.alt = "";
  backdrop.setAttribute("aria-hidden", "true");
  const crew = document.createElement("div");
  crew.className = "scene-crew";
  const coins = document.createElement("div");
  coins.className = "scene-coins";
  const sign = document.createElement("div");
  sign.className = "scene-sign";
  host.append(backdrop, crew, coins, sign);

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
      if (i === seated.length - 1 && seated.length > 1) chip.classList.add("enter");
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
    let coin = COIN_POOL.pop();
    if (!coin) {
      coin = document.createElement("span");
      coin.className = "scene-coin";
      coin.append(pic("🪙", "coin-img"));
    }
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
        backdrop.src = BACKDROPS[officeIdx] ?? BACKDROPS[0] ?? "";
        const office = currentOffice(state);
        sign.textContent = "";
        sign.append(pic(office.emoji, "sign-img"), document.createTextNode(office.name));
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
