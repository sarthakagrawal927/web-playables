import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./style.css";

import { GAMES, type GameMeta } from "./games";

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

  addText(card, "game-card__emoji", game.emoji);

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
wordmark.textContent = "games.";
header.append(wordmark);

const intro = document.createElement("p");
intro.className = "intro";
intro.textContent = "Pick a game and start playing.";
header.append(intro);
main.append(header);

const grid = document.createElement("section");
grid.className = "game-grid";
grid.setAttribute("aria-label", "Games");
grid.append(...GAMES.map(createCard));
main.append(grid);

app.append(backdrop, main);
