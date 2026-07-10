import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./style.css";

import {
  createLoop,
  createPlatform,
  createSaveManager,
  elapsedOfflineSeconds,
  formatDuration,
  formatNumber,
} from "@games/gamekit";
import { LUCK_LIFETIME_SECONDS, LUCK_SPAWN_MEAN_SECONDS, nextRoundName } from "./content";
import * as sim from "./sim";
import { type GameState, initialState, migrations, SAVE_VERSION } from "./state";
import { createUI } from "./ui";

// Boot order matters for YT certification: platform → load (before any save)
// → offline grant → DOM → firstFrameReady after first paint → loop →
// gameReady. All timing (boosts, research, luck spawns) flows through the
// loop tick, so the platform pause signal freezes the whole company.
async function boot() {
  const platform = createPlatform({ storageKey: "save:idle-startup" });
  const saves = createSaveManager<GameState>({
    platform,
    version: SAVE_VERSION,
    migrations,
    initial: initialState,
  });

  const { state, savedAt } = await saves.load();
  const offlineSeconds = elapsedOfflineSeconds(savedAt, Date.now(), sim.offlineCapSeconds(state));
  const offlineEarned = offlineSeconds > 60 ? sim.applyOffline(state, offlineSeconds) : 0;

  const persist = async () => {
    try {
      await saves.save(state);
    } catch {
      // Persistence failures must never crash the game (YT cert: no crashes).
    }
  };

  const app = document.getElementById("app");
  if (!app) throw new Error("#app missing");

  let crashed = false;
  let luckRemaining = 0;

  const ui = createUI(app, {
    onShip(x, y) {
      const amount = sim.shipClick(state);
      ui.spawnCash(amount, x, y);
      ui.render(state);
    },
    onHire(id, avatarSeed) {
      if (sim.buyGenerator(state, id)) {
        sim.recordHire(state, avatarSeed);
        ui.render(state);
        void persist();
      }
    },
    onBuyUpgrade(id) {
      if (sim.buyUpgrade(state, id)) {
        ui.render(state);
        void persist();
      }
    },
    onRaise() {
      const round = nextRoundName(state.rounds);
      const gained = sim.raiseRound(state);
      if (gained > 0) {
        ui.celebrate(
          `${round} raised! 🎉`,
          `◆ +${formatNumber(gained)} investors · +$${formatNumber(gained * sim.INJECTION_PER_POINT)} — salaries just went up`,
        );
        ui.render(state);
        void persist();
      }
    },
    onCampaign() {
      const outcome = sim.launchCampaign(state, Math.random());
      if (!outcome) return;
      if (outcome.tier === "viral") ui.celebrate("🎲 → 📈", outcome.headline);
      else ui.toast(`🎲 ${outcome.headline}`);
      ui.render(state);
      void persist();
    },
    onResearch() {
      if (sim.startResearch(state)) {
        ui.toast("🔬 The lab got quiet. Research started.");
        ui.render(state);
        void persist();
      }
    },
    onLuckClaim() {
      luckRemaining = 0;
      const result = sim.claimLuck(state, Math.random());
      if (result.type === "cash") {
        ui.toast(`${result.headline} — +$${formatNumber(result.amount)}`);
      } else {
        ui.toast(result.headline);
      }
      ui.render(state);
    },
    onRestart() {
      crashed = false;
      ui.render(state);
      void persist();
    },
    onPickFounder(seed) {
      state.founder = seed;
      ui.toast("Day one. Ship something. 🚀");
      ui.render(state);
      void persist();
    },
  });

  let sinceSave = 0;
  const loop = createLoop((dt) => {
    if (crashed) return;
    const events = sim.tick(state, dt);
    ui.render(state);

    for (const m of events.milestones) {
      ui.celebrate(`${m.emoji} ${m.name}`, m.lesson);
    }
    if (events.researchDone) {
      ui.celebrate(
        `🔬 ${events.researchDone.name}`,
        `Revenue ×${events.researchDone.mult}, forever`,
      );
    }

    // lucky bubbles: spawn ~once per LUCK_SPAWN_MEAN_SECONDS, live 12s.
    if (luckRemaining > 0) {
      luckRemaining -= dt;
      if (luckRemaining <= 0) ui.removeLuckBubble();
    } else if (Math.random() < dt / LUCK_SPAWN_MEAN_SECONDS) {
      luckRemaining = LUCK_LIFETIME_SECONDS;
      ui.spawnLuckBubble();
    }

    if (events.crashed) {
      crashed = true;
      const months = sim.companyMonths(state);
      sim.doCrash(state);
      ui.removeLuckBubble();
      ui.showCrash(
        `The company survived ${months} month${months === 1 ? "" : "s"}. Investors remember you (◆ ${formatNumber(state.investors)} kept) — and the lab's research survives.`,
      );
      void persist();
      return;
    }

    sinceSave += dt;
    if (sinceSave >= 30) {
      sinceSave = 0;
      void persist();
    }
  });

  ui.render(state);
  requestAnimationFrame(() => {
    platform.firstFrameReady();
    loop.start();
    platform.gameReady();
    if (state.founder === null) ui.showFounderPicker();
    if (offlineEarned > 0) {
      ui.toast(
        `While you were away (${formatDuration(offlineSeconds)}): +$${formatNumber(offlineEarned)}`,
      );
    }
  });

  platform.onPauseChange((paused) => {
    if (paused) {
      loop.pause();
      ui.setPaused(true);
      void persist();
    } else {
      loop.resume();
      ui.setPaused(false);
    }
  });
}

void boot();
