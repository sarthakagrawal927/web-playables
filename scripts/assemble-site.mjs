import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const gamesDir = path.join(root, "games");
const hubDist = path.join(root, "apps", "hub", "dist");

if (!existsSync(hubDist)) {
  console.error("Hub build not found at apps/hub/dist. Build the hub before assembling the site.");
  process.exit(1);
}

const playDir = path.join(hubDist, "play");
mkdirSync(playDir, { recursive: true });

let copied = 0;
for (const entry of readdirSync(gamesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const source = path.join(gamesDir, entry.name, "dist", "web");
  if (!existsSync(source)) continue;

  const destination = path.join(playDir, entry.name);
  cpSync(source, destination, { recursive: true });
  copied += 1;
  console.log(`Copied games/${entry.name}/dist/web to apps/hub/dist/play/${entry.name}/`);
}

console.log(`Assembled site with ${copied} game${copied === 1 ? "" : "s"}.`);
