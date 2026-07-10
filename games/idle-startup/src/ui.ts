import { formatDuration, formatNumber } from "@games/gamekit";
import { randomSeed, renderAvatar } from "./avatar";
import { createRevenueChart } from "./chart";
import {
  DEPTS,
  GENERATORS,
  type GeneratorDef,
  generatorById,
  nextRoundName,
  PRESTIGE_UNIT,
  researchById,
  roundName,
  type UpgradeDef,
} from "./content";
import {
  availableUpgrades,
  burnPerSec,
  campaignCost,
  canLaunchCampaign,
  clickPower,
  companyAgeLabel,
  earningsToNextInvestor,
  generatorUnitRate,
  generatorVisible,
  grossPerSec,
  hireCost,
  INJECTION_PER_POINT,
  nextResearch,
  owned,
  raiseGain,
  runwaySeconds,
} from "./sim";
import type { GameState } from "./state";

export interface UIHooks {
  onShip(clientX: number, clientY: number): void;
  /** Hire one unit of a role, remembering the chosen candidate's face. */
  onHire(id: string, avatarSeed: number): void;
  onBuyUpgrade(id: string): void;
  onRaise(): void;
  onCampaign(): void;
  onResearch(): void;
  onLuckClaim(): void;
  onRestart(): void;
  onPickFounder(seed: number): void;
}

export interface UI {
  render(state: GameState): void;
  toast(message: string): void;
  spawnCash(amount: number, x: number, y: number): void;
  celebrate(title: string, sub: string): void;
  showCrash(sub: string): void;
  showFounderPicker(): void;
  spawnLuckBubble(): void;
  removeLuckBubble(): void;
  setPaused(paused: boolean): void;
}

const money = (n: number) => `$${formatNumber(n)}`;

const CANDIDATE_NAMES = [
  "Aditi",
  "Bo",
  "Chen",
  "Devi",
  "Esha",
  "Farah",
  "Gio",
  "Hana",
  "Ivy",
  "Jae",
  "Kai",
  "Luz",
  "Mo",
  "Nia",
  "Omar",
  "Pia",
  "Quinn",
  "Rio",
  "Sam",
  "Tara",
  "Uma",
  "Vik",
  "Wren",
  "Yuki",
  "Zane",
];

function deptHue(generatorId: string): number {
  const dept = generatorById(generatorId)?.dept;
  return DEPTS.find((d) => d.id === dept)?.hue ?? 150;
}

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

/** One-shot squash-and-stretch, re-triggerable. */
function boing(node: HTMLElement): void {
  node.classList.remove("boing");
  void node.offsetWidth;
  node.classList.add("boing");
}

interface GenRow {
  root: HTMLButtonElement;
  count: HTMLElement;
  cost: HTMLElement;
  meta: HTMLElement;
}

export function createUI(app: HTMLElement, hooks: UIHooks): UI {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- static structure -------------------------------------------------
  const backdrop = el("div", "backdrop");
  for (const [i, glyph] of ["🚀", "⭐", "💡", "📦", "☁️"].entries()) {
    const float = el("span", "floaty", glyph);
    float.style.setProperty("--i", String(i));
    backdrop.append(float);
  }
  app.append(backdrop);
  const frame = el("div", "frame");
  app.append(frame);

  const header = el("header", "top");
  const founderFace = el("span", "founder-face");
  const brand = el("div", "brand");
  brand.append(founderFace, el("span", "brand-name", "Idle Startup"));
  const ageChip = el("span", "age-chip", "Y1 · M1");
  const roundBadge = el("span", "round-badge", roundName(0));
  const investorsChip = el("span", "investors-chip hidden", "");
  header.append(brand, ageChip, roundBadge, investorsChip);

  // founder column
  const founder = el("section", "founder");

  const cashCard = el("div", "card cash-card");
  const cashValue = el("div", "cash-value", "$0");
  const cashNet = el("div", "cash-net", "");
  const cashRunway = el("div", "cash-runway hidden", "");
  const boostChips = el("div", "boost-chips", "");
  const chartCanvas = el("canvas", "revenue-chart");
  chartCanvas.setAttribute("aria-hidden", "true");
  const chart = createRevenueChart(chartCanvas);
  cashCard.append(
    el("div", "eyebrow", "Company balance"),
    cashValue,
    cashNet,
    cashRunway,
    boostChips,
    chartCanvas,
  );

  const shipBtn = el("button", "ship-btn");
  const shipAmount = el("span", "ship-amount", "+$10");
  shipBtn.append(
    el("span", "ship-emoji", "🚀"),
    el("span", "ship-label", "Ship feature"),
    shipAmount,
  );
  shipBtn.addEventListener("click", (e) => {
    const rect = shipBtn.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top;
    if (!reducedMotion) boing(shipBtn);
    hooks.onShip(x, y);
  });

  // actions: ad campaign (dice) + research lab
  const actionsCard = el("div", "card actions-card");
  actionsCard.append(el("div", "eyebrow", "Actions"));
  const adBtn = el("button", "action-btn ad-btn");
  const adMeta = el("span", "action-meta", "");
  adBtn.append(
    el("span", "action-label", "📣 Ad campaign"),
    el("span", "action-dice", "🎲"),
    adMeta,
  );
  adBtn.addEventListener("click", () => {
    if (!reducedMotion) boing(adBtn);
    hooks.onCampaign();
  });
  const labBtn = el("button", "action-btn lab-btn");
  const labMeta = el("span", "action-meta", "");
  labBtn.append(el("span", "action-label", "🔬 Research"), labMeta);
  labBtn.addEventListener("click", () => hooks.onResearch());
  const labBar = el("div", "lab-bar hidden");
  const labFill = el("div", "lab-fill");
  labBar.append(labFill);
  actionsCard.append(adBtn, labBtn, labBar);

  const fundCard = el("div", "card fund-card");
  const fundStatus = el("div", "fund-status", "");
  const fundBar = el("div", "fund-bar");
  const fundFill = el("div", "fund-fill");
  fundBar.append(fundFill);
  const fundBtn = el("button", "fund-btn", "Raise round");
  fundBtn.addEventListener("click", () => hooks.onRaise());
  fundCard.append(el("div", "eyebrow", "Funding"), fundStatus, fundBar, fundBtn);

  founder.append(cashCard, shipBtn, actionsCard, fundCard);

  // ops column: org chart by department + upgrades
  const ops = el("section", "ops");
  const teamPanel = el("section", "panel");
  const teamTitleRow = el("div", "panel-title-row");
  teamTitleRow.append(el("h2", "panel-title", "The org"));
  const facesStrip = el("div", "faces-strip");
  teamTitleRow.append(facesStrip);
  teamPanel.append(teamTitleRow);
  const deptBoxes = new Map<string, { head: HTMLElement; box: HTMLElement }>();
  for (const dept of DEPTS) {
    const head = el("div", "dept-head hidden");
    head.style.setProperty("--dept-h", String(dept.hue));
    head.append(el("span", "dept-name", dept.name), el("span", "dept-perk", dept.perk));
    const box = el("div", "gen-rows");
    teamPanel.append(head, box);
    deptBoxes.set(dept.id, { head, box });
  }

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
  const hireVeil = el("div", "modal-veil hidden");
  const crashVeil = el("div", "crash-veil hidden");
  const pauseVeil = el("div", "pause-veil hidden");
  pauseVeil.append(el("div", "pause-text", "Paused"));
  app.append(fxLayer, toastBox, celebration, hireVeil, crashVeil, pauseVeil);

  // ---- hire modal: choose WHO you hire -----------------------------------
  const closeHireModal = () => hireVeil.classList.add("hidden");
  hireVeil.addEventListener("click", (e) => {
    if (e.target === hireVeil) closeHireModal();
  });
  const openHireModal = (def: GeneratorDef, cost: number) => {
    hireVeil.textContent = "";
    const modal = el("div", "modal hire-modal");
    modal.style.setProperty("--medal-h", String(deptHue(def.id)));
    modal.append(
      el("div", "modal-title", "Who gets the offer?"),
      el("div", "modal-sub", `${def.name} · ${money(cost)} · then ${money(def.salary)}/s salary`),
    );
    const rowBox = el("div", "candidates");
    const names = [...CANDIDATE_NAMES].sort(() => Math.random() - 0.5).slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const seed = randomSeed();
      const cand = el("button", "candidate");
      cand.type = "button";
      const face = el("span", "candidate-face");
      renderAvatar(face, seed);
      cand.append(
        face,
        el("span", "candidate-name", names[i] ?? "Alex"),
        el("span", "candidate-hire", "Hire"),
      );
      cand.addEventListener("click", () => {
        closeHireModal();
        hooks.onHire(def.id, seed);
      });
      rowBox.append(cand);
    }
    modal.append(rowBox);
    const cancel = el("button", "modal-cancel", "Not now");
    cancel.addEventListener("click", closeHireModal);
    modal.append(cancel);
    hireVeil.append(modal);
    hireVeil.classList.remove("hidden");
  };

  // ---- founder picker ------------------------------------------------------
  const showFounderPicker = () => {
    hireVeil.textContent = "";
    const modal = el("div", "modal founder-modal");
    modal.append(
      el("div", "modal-title", "Who's the founder?"),
      el("div", "modal-sub", "Pick your character. Rule #1: don't run out of money."),
    );
    const grid = el("div", "candidates founder-grid");
    const fill = () => {
      grid.textContent = "";
      for (let i = 0; i < 6; i++) {
        const seed = randomSeed();
        const cand = el("button", "candidate");
        cand.type = "button";
        const face = el("span", "candidate-face");
        renderAvatar(face, seed);
        cand.append(face, el("span", "candidate-hire", "That's me"));
        cand.addEventListener("click", () => {
          hireVeil.classList.add("hidden");
          hooks.onPickFounder(seed);
        });
        grid.append(cand);
      }
    };
    fill();
    modal.append(grid);
    const reroll = el("button", "modal-cancel", "🎲 Show me different people");
    reroll.addEventListener("click", fill);
    modal.append(reroll);
    hireVeil.append(modal);
    hireVeil.classList.remove("hidden");
  };

  // ---- generator rows -----------------------------------------------------
  const genRows = new Map<string, GenRow>();
  for (const def of GENERATORS) {
    const root = el("button", "gen-row hidden");
    root.type = "button";
    root.style.setProperty("--medal-h", String(deptHue(def.id)));
    const emoji = el("span", "gen-medal", def.emoji);
    emoji.setAttribute("aria-hidden", "true");
    const body = el("div", "gen-body");
    const nameLine = el("div", "gen-name", def.name);
    const count = el("span", "gen-count", "");
    nameLine.append(count);
    body.append(nameLine, el("div", "gen-flavor", def.flavor));
    const buy = el("div", "gen-buy");
    const cost = el("span", "gen-cost", "");
    const meta = el("span", "gen-rate", "");
    buy.append(cost, meta);
    root.append(emoji, body, buy);
    root.addEventListener("click", () => {
      if (!reducedMotion) boing(root);
      openHireModal(def, lastHireCosts.get(def.id) ?? def.baseCost);
    });
    deptBoxes.get(def.dept)?.box.append(root);
    genRows.set(def.id, { root, count, cost, meta });
  }
  const lastHireCosts = new Map<string, number>();

  // ---- upgrade cards ------------------------------------------------------
  const upgCards = new Map<string, { root: HTMLButtonElement; def: UpgradeDef }>();
  let upgKey = "";
  const rebuildUpgrades = (defs: UpgradeDef[]) => {
    upgCardsBox.textContent = "";
    upgCards.clear();
    for (const def of defs) {
      const card = el("button", "upg-card");
      card.type = "button";
      const chip = el("span", "upg-chip");
      if (def.target === "click") {
        chip.textContent = "per ship";
        chip.style.setProperty("--chip-h", "150");
      } else if (def.target === "all") {
        chip.textContent = "everything";
        chip.style.setProperty("--chip-h", "258");
      } else {
        chip.textContent = generatorById(def.target)?.name.toLowerCase() ?? def.target;
        chip.style.setProperty("--chip-h", String(deptHue(def.target)));
      }
      card.append(
        el("div", "upg-name", def.name),
        el("div", "upg-flavor", def.flavor),
        chip,
        el("div", "upg-cost", money(def.cost)),
      );
      card.addEventListener("click", () => hooks.onBuyUpgrade(def.id));
      upgCardsBox.append(card);
      upgCards.set(def.id, { root: card, def });
    }
    upgEmpty.classList.toggle("hidden", defs.length > 0);
  };

  // ---- fx -------------------------------------------------------------------
  const POP_POOL: HTMLSpanElement[] = [];
  let popAlternate = false;
  const spawnCash = (amount: number, x: number, y: number) => {
    if (reducedMotion) return;
    const pop = POP_POOL.pop() ?? el("span", "cash-pop");
    popAlternate = !popAlternate;
    pop.textContent = popAlternate ? `+${money(amount)}` : "🪙";
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    fxLayer.append(pop);
    const dx = (Math.random() - 0.5) * 120;
    const spin = (Math.random() - 0.5) * 60;
    const anim = pop.animate(
      [
        { transform: "translate(-50%, 0) scale(0.6) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx * 0.4}px), -60px) scale(1.25) rotate(${spin * 0.5}deg)`,
          opacity: 1,
          offset: 0.35,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), -150px) scale(0.9) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      { duration: 1000, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" },
    );
    anim.onfinish = () => {
      pop.remove();
      if (POP_POOL.length < 24) POP_POOL.push(pop);
    };
  };

  const CONFETTI_COLORS = ["#3ee089", "#a08bff", "#ffc45e", "#e9ecfa", "#5ea8ff", "#ff7ab8"];
  const rainConfetti = (host: HTMLElement, count: number) => {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const c = el("span", "confetto");
      c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "#fff";
      c.style.left = `${Math.random() * 100}%`;
      host.append(c);
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
  };

  let celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  const celebrate = (title: string, sub: string) => {
    celebration.textContent = "";
    celebration.append(el("div", "celebration-title", title), el("div", "celebration-sub", sub));
    celebration.classList.remove("hidden");
    rainConfetti(celebration, 44);
    clearTimeout(celebrationTimer);
    celebrationTimer = setTimeout(() => celebration.classList.add("hidden"), 3000);
  };

  const showCrash = (sub: string) => {
    crashVeil.textContent = "";
    const box = el("div", "crash-box");
    const restart = el("button", "crash-btn", "Start over 🌱");
    restart.addEventListener("click", () => {
      crashVeil.classList.add("hidden");
      hooks.onRestart();
    });
    box.append(
      el("div", "crash-emoji", "💥"),
      el("div", "crash-title", "Out of runway"),
      el("div", "crash-sub", sub),
      restart,
    );
    crashVeil.append(box);
    crashVeil.classList.remove("hidden");
  };

  // lucky bubble (one at a time)
  let luckBubble: HTMLButtonElement | null = null;
  const removeLuckBubble = () => {
    luckBubble?.remove();
    luckBubble = null;
  };
  const spawnLuckBubble = () => {
    removeLuckBubble();
    const bubble = el("button", "luck-bubble");
    bubble.type = "button";
    bubble.textContent = "💎";
    bubble.setAttribute("aria-label", "Lucky event — grab it!");
    bubble.style.left = `${12 + Math.random() * 70}%`;
    bubble.style.top = `${18 + Math.random() * 55}%`;
    bubble.addEventListener("click", () => {
      removeLuckBubble();
      hooks.onLuckClaim();
    });
    app.append(bubble);
    luckBubble = bubble;
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
      clearTimeout(celebrationTimer);
      clearTimeout(toastTimer);
      celebration.classList.add("hidden");
      toastBox.classList.remove("show");
    }
  };

  // ---- per-tick patch render ---------------------------------------------
  let displayCash = 0;
  let renderCount = 0;
  let lastFounderSeed: number | null = null;
  let lastTeamLen = -1;
  const render = (state: GameState) => {
    displayCash = reducedMotion ? state.cash : displayCash + (state.cash - displayCash) * 0.35;
    if (Math.abs(displayCash - state.cash) < 0.5) displayCash = state.cash;
    cashValue.textContent = money(Math.max(0, displayCash));

    const gross = grossPerSec(state);
    const burn = burnPerSec(state);
    const net = gross - burn;
    cashNet.textContent =
      burn > 0
        ? `${net >= 0 ? "+" : "−"}${money(Math.abs(net))}/s net · ${money(burn)}/s payroll`
        : `+${money(gross)}/s revenue`;
    cashNet.classList.toggle("negative", net < 0);

    const runway = runwaySeconds(state);
    const showRunway = net < 0 && Number.isFinite(runway);
    cashRunway.classList.toggle("hidden", !showRunway);
    if (showRunway) {
      cashRunway.textContent = `⏳ Runway ${formatDuration(runway)} — grow or crash`;
      cashRunway.classList.toggle("critical", runway < 60);
    }

    boostChips.textContent = "";
    if (state.boosts.adRemaining > 0) {
      boostChips.append(
        el(
          "span",
          "boost-chip ad",
          `📣 ×${state.boosts.adMult} · ${Math.ceil(state.boosts.adRemaining)}s`,
        ),
      );
    }
    if (state.boosts.frenzyRemaining > 0) {
      boostChips.append(
        el(
          "span",
          "boost-chip frenzy",
          `⚡ ship frenzy · ${Math.ceil(state.boosts.frenzyRemaining)}s`,
        ),
      );
    }

    shipAmount.textContent = `+${money(clickPower(state))}`;

    ageChip.textContent = companyAgeLabel(state);
    roundBadge.textContent = `${roundName(state.rounds)} stage`;
    investorsChip.classList.toggle("hidden", state.investors === 0);
    if (state.investors > 0) {
      investorsChip.textContent = `◆ ${formatNumber(state.investors)} investors · +${formatNumber(state.investors * 2)}%`;
    }

    if (state.founder !== null && state.founder !== lastFounderSeed) {
      lastFounderSeed = state.founder;
      renderAvatar(founderFace, state.founder);
    }
    if (state.team.length !== lastTeamLen) {
      lastTeamLen = state.team.length;
      facesStrip.textContent = "";
      for (const seed of state.team.slice(-10)) {
        const face = el("span", "strip-face");
        renderAvatar(face, seed);
        facesStrip.append(face);
      }
    }

    renderCount += 1;
    if (renderCount % 4 === 1) chart.push(gross);

    // org chart
    for (const dept of DEPTS) {
      let anyVisible = false;
      for (const def of GENERATORS) {
        if (def.dept !== dept.id) continue;
        const row = genRows.get(def.id);
        if (!row) continue;
        const visible = generatorVisible(state, def);
        row.root.classList.toggle("hidden", !visible);
        if (!visible) continue;
        anyVisible = true;
        const count = owned(state, def.id);
        const cost = hireCost(state, def);
        lastHireCosts.set(def.id, cost);
        row.count.textContent = count > 0 ? `× ${count}` : "";
        row.cost.textContent = money(cost);
        row.root.classList.toggle("hired", count > 0);
        if (def.baseRate > 0) {
          row.meta.textContent = `${money(generatorUnitRate(state, def))}/s · ${money(def.salary)}/s pay`;
        } else {
          row.meta.textContent = `${dept.short} · ${money(def.salary)}/s pay`;
        }
        const affordable = state.cash >= cost;
        row.root.classList.toggle("affordable", affordable);
        row.root.disabled = !affordable;
      }
      const box = deptBoxes.get(dept.id);
      box?.head.classList.toggle("hidden", !anyVisible);
    }

    // upgrades
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

    // actions
    const adCost = campaignCost(state);
    if (state.boosts.adCooldown > 0) {
      adMeta.textContent = `ready in ${Math.ceil(state.boosts.adCooldown)}s`;
      adBtn.disabled = true;
    } else {
      adMeta.textContent = `${money(adCost)} · roll the dice`;
      adBtn.disabled = !canLaunchCampaign(state);
    }

    const running = state.research.current ? researchById(state.research.current) : null;
    const next = nextResearch(state);
    if (running) {
      labMeta.textContent = `${running.name} — ${Math.floor((state.research.progress / running.seconds) * 100)}%`;
      labBtn.disabled = true;
      labBar.classList.remove("hidden");
      labFill.style.width = `${Math.min(100, (state.research.progress / running.seconds) * 100)}%`;
    } else if (next) {
      labMeta.textContent = `${next.name} · ${money(next.cost)} · ${formatDuration(next.seconds)}`;
      labBtn.disabled = state.cash < next.cost;
      labBar.classList.add("hidden");
    } else {
      labMeta.textContent = "the lab has shipped everything";
      labBtn.disabled = true;
      labBar.classList.add("hidden");
    }

    // funding
    const gain = raiseGain(state);
    const nextName = nextRoundName(state.rounds);
    if (gain >= 1) {
      fundStatus.textContent = `Raise your ${nextName}: +◆ ${formatNumber(gain)}, +${money(gain * INJECTION_PER_POINT)} cash — and salaries jump 25%.`;
      fundBtn.textContent = `Raise ${nextName} 🎉`;
      fundBtn.disabled = false;
      fundFill.style.width = "100%";
    } else {
      const needed = earningsToNextInvestor(state);
      fundStatus.textContent = `Earn ${money(needed)} more to interest investors. Raising fuels growth — and burn.`;
      fundBtn.textContent = `Raise ${nextName}`;
      fundBtn.disabled = true;
      const target = (state.raisedThisRun + 1) ** 2 * PRESTIGE_UNIT;
      fundFill.style.width = `${Math.min(100, (state.totalEarned / target) * 100).toFixed(1)}%`;
    }
  };

  return {
    render,
    toast,
    spawnCash,
    celebrate,
    showCrash,
    showFounderPicker,
    spawnLuckBubble,
    removeLuckBubble,
    setPaused,
  };
}
