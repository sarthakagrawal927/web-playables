import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./style.css";

import coverIdleStartup from "./assets/cover-idle-startup.jpg";
import { drawCover } from "./cover";

const COVER_ART: Record<string, string> = { "idle-startup": coverIdleStartup };

import { GAMES, type GameMeta } from "./games";

const COVER_HUES: Record<string, number> = {
  "idle-startup": 150,
  "coming-soon": 258,
};

function addText(parent: HTMLElement, className: string, text: string) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  parent.append(element);
}

function createCard(game: GameMeta) {
  const card = document.createElement(game.status === "live" ? "a" : "article");
  card.className = `game-card game-card--${game.status}`;

  if (card instanceof HTMLAnchorElement) {
    card.href = `./play/${game.id}/`;
    card.setAttribute("aria-label", `Play ${game.title}`);
  }

  const art = document.createElement("div");
  art.className = "game-card__art";
  const artUrl = COVER_ART[game.id];
  if (artUrl) {
    const cover = document.createElement("img");
    cover.className = "game-card__cover";
    cover.src = artUrl;
    cover.alt = "";
    art.append(cover);
  } else {
    const cover = document.createElement("canvas");
    cover.className = "game-card__cover";
    cover.setAttribute("aria-hidden", "true");
    drawCover(cover, {
      hue: COVER_HUES[game.id] ?? 210,
      muted: game.status === "soon",
      seed: game.id.length * 31,
    });
    art.append(cover);
  }
  addText(art, "game-card__emoji", game.emoji);
  card.append(art);

  const body = document.createElement("div");
  body.className = "game-card__body";

  const title = document.createElement("h2");
  title.textContent = game.title;
  body.append(title);

  const tagline = document.createElement("p");
  tagline.textContent = game.tagline;
  body.append(tagline);

  addText(
    body,
    game.status === "live" ? "game-card__play" : "game-card__soon",
    game.status === "live" ? "Play →" : "Soon",
  );
  card.append(body);

  return card;
}

const app = document.getElementById("app");
if (!app) throw new Error("#app missing");

const backdrop = document.createElement("div");
backdrop.className = "backdrop";
backdrop.setAttribute("aria-hidden", "true");

const main = document.createElement("main");
main.className = "frame";

const header = document.createElement("header");
const wordmark = document.createElement("h1");
wordmark.textContent = "idle.";
header.append(wordmark);

const intro = document.createElement("p");
intro.className = "intro";
intro.textContent =
  "A small directory of browser-playable games and experiments. Pick one and start playing.";
header.append(intro);
main.append(header);

const grid = document.createElement("section");
grid.className = "game-grid";
grid.setAttribute("aria-label", "Games");
grid.append(...GAMES.map(createCard));
main.append(grid);

app.append(backdrop, main);
