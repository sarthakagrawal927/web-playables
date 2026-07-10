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
import { nextRoundName } from "./content";
import * as sim from "./sim";
import { initialState, migrations, SAVE_VERSION, type GameState } from "./state";
import { createUI } from "./ui";

// Boot order matters for YT certification: platform → load (before any save)
// → offline grant → DOM → firstFrameReady after first paint → loop →
// gameReady. All timing flows through the loop + platform pause signal.
async function boot() {
  const platform = createPlatform({ storageKey: "save:idle-startup" });
  const saves = createSaveManager<GameState>({
    platform,
    version: SAVE_VERSION,
    migrations,
    initial: initialState,
  });

  const { state, savedAt } = await saves.load();
  const offlineSeconds = elapsedOfflineSeconds(savedAt, Date.now());
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

  const ui = createUI(app, {
    onShip(x, y) {
      const amount = sim.shipClick(state);
      ui.spawnCash(amount, x, y);
      ui.render(state);
    },
    onBuyGenerator(id) {
      if (sim.buyGenerator(state, id)) ui.render(state);
    },
    onBuyUpgrade(id) {
      if (sim.buyUpgrade(state, id)) {
        ui.render(state);
        void persist();
      }
    },
    onPrestige() {
      const round = nextRoundName(state.rounds);
      const gained = sim.prestigeGain(state);
      if (sim.doPrestige(state)) {
        ui.celebrate(
          `${round} raised!`,
          `◆ +${formatNumber(gained)} investors — revenue +${formatNumber(state.investors * 2)}% forever`,
        );
        ui.render(state);
        void persist();
      }
    },
  });

  let sinceSave = 0;
  const loop = createLoop((dt) => {
    sim.tick(state, dt);
    sinceSave += dt;
    if (sinceSave >= 30) {
      sinceSave = 0;
      void persist();
    }
    ui.render(state);
  });

  ui.render(state);
  requestAnimationFrame(() => {
    platform.firstFrameReady();
    loop.start();
    platform.gameReady();
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
