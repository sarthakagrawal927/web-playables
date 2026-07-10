import { formatNumber } from "@games/gamekit";
import { GENERATORS, nextRoundName, roundName, type UpgradeDef } from "./content";
import {
  availableUpgrades,
  clickPower,
  earningsToNextInvestor,
  generatorCost,
  generatorUnitRate,
  generatorVisible,
  owned,
  prestigeGain,
  productionPerSec,
} from "./sim";
import type { GameState } from "./state";

export interface UIHooks {
  onShip(clientX: number, clientY: number): void;
  onBuyGenerator(id: string): void;
  onBuyUpgrade(id: string): void;
  onPrestige(): void;
}

export interface UI {
  render(state: GameState): void;
  toast(message: string): void;
  spawnCash(amount: number, x: number, y: number): void;
  celebrate(title: string, sub: string): void;
  setPaused(paused: boolean): void;
}

const money = (n: number) => `$${formatNumber(n)}`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

interface GenRow {
  root: HTMLButtonElement;
  count: HTMLElement;
  cost: HTMLElement;
  rate: HTMLElement;
}

export function createUI(app: HTMLElement, hooks: UIHooks): UI {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- static structure -------------------------------------------------
  app.append(el("div", "backdrop"));
  const frame = el("div", "frame");
  app.append(frame);

  const header = el("header", "top");
  const brand = el("div", "brand");
  brand.append(el("span", "brand-mark", "▲"), el("span", "brand-name", "Idle Startup"));
  const roundBadge = el("span", "round-badge", roundName(0));
  const investorsChip = el("span", "investors-chip hidden", "");
  header.append(brand, roundBadge, investorsChip);

  const founder = el("section", "founder");
  const cashCard = el("div", "card cash-card");
  const cashValue = el("div", "cash-value", "$0");
  const cashRate = el("div", "cash-rate", "$0/s revenue");
  cashCard.append(el("div", "eyebrow", "Company balance"), cashValue, cashRate);

  const shipBtn = el("button", "ship-btn");
  const shipAmount = el("span", "ship-amount", "+$1");
  shipBtn.append(el("span", "ship-label", "Ship feature"), shipAmount);
  shipBtn.addEventListener("click", (e) => {
    const rect = shipBtn.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top;
    hooks.onShip(x, y);
  });

  const fundCard = el("div", "card fund-card");
  const fundStatus = el("div", "fund-status", "");
  const fundBar = el("div", "fund-bar");
  const fundFill = el("div", "fund-fill");
  fundBar.append(fundFill);
  const fundBtn = el("button", "fund-btn", "Raise round");
  fundBtn.addEventListener("click", () => hooks.onPrestige());
  fundCard.append(el("div", "eyebrow", "Next funding round"), fundStatus, fundBar, fundBtn);

  founder.append(cashCard, shipBtn, fundCard);

  const ops = el("section", "ops");
  const teamPanel = el("section", "panel");
  teamPanel.append(el("h2", "panel-title", "Team"));
  const genRowsBox = el("div", "gen-rows");
  teamPanel.append(genRowsBox);

  const upgPanel = el("section", "panel");
  upgPanel.append(el("h2", "panel-title", "Upgrades"));
  const upgEmpty = el("p", "upg-empty", "Keep shipping — upgrades unlock as the team grows.");
  const upgCardsBox = el("div", "upg-cards");
  upgPanel.append(upgEmpty, upgCardsBox);

  ops.append(teamPanel, upgPanel);
  frame.append(header, founder, ops);

  const fxLayer = el("div", "fx-layer");
  const toastBox = el("div", "toast");
  const celebration = el("div", "celebration hidden");
  const pauseVeil = el("div", "pause-veil hidden");
  pauseVeil.append(el("div", "pause-text", "Paused"));
  app.append(fxLayer, toastBox, celebration, pauseVeil);

  // ---- generator rows (built once, patched per render) -------------------
  const genRows = new Map<string, GenRow>();
  for (const def of GENERATORS) {
    const root = el("button", "gen-row hidden");
    root.type = "button";
    const emoji = el("span", "gen-emoji", def.emoji);
    emoji.setAttribute("aria-hidden", "true");
    const body = el("div", "gen-body");
    const nameLine = el("div", "gen-name", def.name);
    const count = el("span", "gen-count", "");
    nameLine.append(count);
    body.append(nameLine, el("div", "gen-flavor", def.flavor));
    const buy = el("div", "gen-buy");
    const cost = el("span", "gen-cost", money(def.baseCost));
    const rate = el("span", "gen-rate", `${formatNumber(def.baseRate)}/s each`);
    buy.append(cost, rate);
    root.append(emoji, body, buy);
    root.addEventListener("click", () => hooks.onBuyGenerator(def.id));
    genRowsBox.append(root);
    genRows.set(def.id, { root, count, cost, rate });
  }

  // ---- upgrade cards (rebuilt when the available set changes) ------------
  const upgCards = new Map<string, { root: HTMLButtonElement; def: UpgradeDef }>();
  let upgKey = "";
  const rebuildUpgrades = (defs: UpgradeDef[]) => {
    upgCardsBox.textContent = "";
    upgCards.clear();
    for (const def of defs) {
      const card = el("button", "upg-card");
      card.type = "button";
      card.append(
        el("div", "upg-name", def.name),
        el("div", "upg-flavor", def.flavor),
        el("div", "upg-cost", money(def.cost)),
      );
      card.addEventListener("click", () => hooks.onBuyUpgrade(def.id));
      upgCardsBox.append(card);
      upgCards.set(def.id, { root: card, def });
    }
    upgEmpty.classList.toggle("hidden", defs.length > 0);
  };

  // ---- fx ----------------------------------------------------------------
  const POP_POOL: HTMLSpanElement[] = [];
  const spawnCash = (amount: number, x: number, y: number) => {
    if (reducedMotion) return;
    const pop = POP_POOL.pop() ?? el("span", "cash-pop");
    pop.textContent = `+${money(amount)}`;
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    fxLayer.append(pop);
    const dx = (Math.random() - 0.5) * 90;
    const anim = pop.animate(
      [
        { transform: "translate(-50%, 0) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), -110px) scale(0.9)`, opacity: 0 },
      ],
      { duration: 900, easing: "cubic-bezier(0.2, 0.6, 0.3, 1)" },
    );
    anim.onfinish = () => {
      pop.remove();
      if (POP_POOL.length < 24) POP_POOL.push(pop);
    };
  };

  const CONFETTI_COLORS = ["#3ee089", "#a08bff", "#ffc45e", "#e9ecfa", "#5ea8ff"];
  let celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  const celebrate = (title: string, sub: string) => {
    celebration.textContent = "";
    celebration.append(el("div", "celebration-title", title), el("div", "celebration-sub", sub));
    celebration.classList.remove("hidden");
    if (!reducedMotion) {
      for (let i = 0; i < 40; i++) {
        const c = el("span", "confetto");
        c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "#fff";
        c.style.left = `${Math.random() * 100}%`;
        celebration.append(c);
        c.animate(
          [
            { transform: "translateY(-10vh) rotate(0deg)", opacity: 1 },
            {
              transform: `translateY(110vh) rotate(${540 + Math.random() * 360}deg)`,
              opacity: 0.7,
            },
          ],
          {
            duration: 1800 + Math.random() * 1400,
            delay: Math.random() * 250,
            easing: "cubic-bezier(0.3, 0, 0.8, 1)",
          },
        );
      }
    }
    clearTimeout(celebrationTimer);
    celebrationTimer = setTimeout(() => celebration.classList.add("hidden"), 3000);
  };

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const toast = (message: string) => {
    toastBox.textContent = message;
    toastBox.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastBox.classList.remove("show"), 4500);
  };

  const setPaused = (paused: boolean) => {
    document.body.classList.toggle("paused", paused);
    pauseVeil.classList.toggle("hidden", !paused);
    if (paused) {
      // Halt transient effects along with everything else (YT cert: pause all).
      clearTimeout(celebrationTimer);
      clearTimeout(toastTimer);
      celebration.classList.add("hidden");
      toastBox.classList.remove("show");
    }
  };

  // ---- per-tick patch render ---------------------------------------------
  let displayCash = 0;
  const render = (state: GameState) => {
    // Count-up: ease the displayed balance toward the true balance.
    displayCash = reducedMotion ? state.cash : displayCash + (state.cash - displayCash) * 0.35;
    if (Math.abs(displayCash - state.cash) < 0.5) displayCash = state.cash;
    cashValue.textContent = money(displayCash);
    cashRate.textContent = `${money(productionPerSec(state))}/s revenue`;
    shipAmount.textContent = `+${money(clickPower(state))}`;

    roundBadge.textContent = `${roundName(state.rounds)} stage`;
    investorsChip.classList.toggle("hidden", state.investors === 0);
    if (state.investors > 0) {
      investorsChip.textContent = `◆ ${formatNumber(state.investors)} investors · +${formatNumber(state.investors * 2)}%`;
    }

    for (const [index, def] of GENERATORS.entries()) {
      const row = genRows.get(def.id);
      if (!row) continue;
      const visible = generatorVisible(state, index);
      row.root.classList.toggle("hidden", !visible);
      if (!visible) continue;
      const count = owned(state, def.id);
      const cost = generatorCost(def, count);
      row.count.textContent = count > 0 ? `× ${count}` : "";
      row.cost.textContent = money(cost);
      row.rate.textContent = `${money(generatorUnitRate(state, def))}/s each`;
      const affordable = state.cash >= cost;
      row.root.classList.toggle("affordable", affordable);
      row.root.disabled = !affordable;
    }

    const avail = availableUpgrades(state);
    const key = avail.map((u) => u.id).join(",");
    if (key !== upgKey) {
      upgKey = key;
      rebuildUpgrades(avail);
    }
    for (const { root, def } of upgCards.values()) {
      const affordable = state.cash >= def.cost;
      root.classList.toggle("affordable", affordable);
      root.disabled = !affordable;
    }

    const gain = prestigeGain(state);
    const next = nextRoundName(state.rounds);
    if (gain >= 1) {
      fundStatus.textContent = `Investors are ready: raise your ${next} for ◆ ${formatNumber(gain)} investor${gain > 1 ? "s" : ""} (+${formatNumber(gain * 2)}% revenue, forever). Resets the company.`;
      fundBtn.textContent = `Raise ${next}`;
      fundBtn.disabled = false;
      fundFill.style.width = "100%";
    } else {
      const needed = earningsToNextInvestor(state);
      fundStatus.textContent = `Earn ${money(needed)} more this run to interest investors.`;
      fundBtn.textContent = `Raise ${next}`;
      fundBtn.disabled = true;
      fundFill.style.width = `${Math.min(100, (state.totalEarned / 1_000_000) * 100).toFixed(1)}%`;
    }
  };

  return { render, toast, spawnCash, celebrate, setPaused };
}
