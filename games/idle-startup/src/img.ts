// Bundled 3D illustrated icons (Microsoft Fluent Emoji, MIT — see README).
// Every sprite ships in the build: glossy hyper-casual art, zero external
// requests, which is what YouTube Playables certification requires.

import abacus from "./sprites/abacus.png";
import balloon from "./sprites/balloon.png";
import box from "./sprites/box.png";
import car from "./sprites/car.png";
import card_box from "./sprites/card_box.png";
import chair from "./sprites/chair.png";
import chart_up from "./sprites/chart_up.png";
import city_dusk from "./sprites/city_dusk.png";
import classical from "./sprites/classical.png";
import clipboard from "./sprites/clipboard.png";
import cloud from "./sprites/cloud.png";
import coffee from "./sprites/coffee.png";
import coin from "./sprites/coin.png";
import collision from "./sprites/collision.png";
import couch from "./sprites/couch.png";
import crane from "./sprites/crane.png";
import die from "./sprites/die.png";
import dollar from "./sprites/dollar.png";
import factory from "./sprites/factory.png";
import fire from "./sprites/fire.png";
import fish from "./sprites/fish.png";
import gem from "./sprites/gem.png";
import handshake from "./sprites/handshake.png";
import helicopter from "./sprites/helicopter.png";
import hourglass from "./sprites/hourglass.png";
import liberty from "./sprites/liberty.png";
import lightbulb from "./sprites/lightbulb.png";
import mage from "./sprites/mage.png";
import megaphone from "./sprites/megaphone.png";
import microscope from "./sprites/microscope.png";
import money_wings from "./sprites/money_wings.png";
import office from "./sprites/office.png";
import office_worker from "./sprites/office_worker.png";
import palette from "./sprites/palette.png";
import party from "./sprites/party.png";
import phone from "./sprites/phone.png";
import plant from "./sprites/plant.png";
import pool8 from "./sprites/pool8.png";
import printer from "./sprites/printer.png";
import robot from "./sprites/robot.png";
import rocket from "./sprites/rocket.png";
import ruler from "./sprites/ruler.png";
import scales from "./sprites/scales.png";
import star from "./sprites/star.png";
import target from "./sprites/target.png";
import technologist from "./sprites/technologist.png";
import toolbox from "./sprites/toolbox.png";
import tools from "./sprites/tools.png";
import tree from "./sprites/tree.png";
import trophy from "./sprites/trophy.png";
import turtle from "./sprites/turtle.png";
import woman_tech from "./sprites/woman_tech.png";
import zap from "./sprites/zap.png";
import zen from "./sprites/zen.png";

/** emoji character → bundled sprite URL */
export const SPRITES: Record<string, string> = {
  "🎈": balloon,
  "📈": chart_up,
  "🎲": die,
  "🎯": target,
  "💥": collision,
  "💡": lightbulb,
  "💵": dollar,
  "💸": money_wings,
  "📋": clipboard,
  "📣": megaphone,
  "📦": box,
  "📞": phone,
  "🔥": fire,
  "🔬": microscope,
  "🖨️": printer,
  "🗂️": card_box,
  "🗽": liberty,
  "🌆": city_dusk,
  "🌳": tree,
  "🐟": fish,
  "🐢": turtle,
  "👩‍💻": woman_tech,
  "💎": gem,
  "🚀": rocket,
  "🚁": helicopter,
  "🚗": car,
  "🛋️": couch,
  "🛠️": tools,
  "🎨": palette,
  "🎱": pool8,
  "🏆": trophy,
  "🏗️": crane,
  "🏛️": classical,
  "🏢": office,
  "🏭": factory,
  "🤖": robot,
  "🤝": handshake,
  "🧙": mage,
  "🧑‍💻": technologist,
  "🧑‍💼": office_worker,
  "🧘": zen,
  "🧮": abacus,
  "🧰": toolbox,
  "📐": ruler,
  "🪑": chair,
  "🪙": coin,
  "🪴": plant,
  "⏳": hourglass,
  "⚖️": scales,
  "⚡": zap,
  "☕": coffee,
  "☁️": cloud,
  "⭐": star,
  "🎉": party,
};

/**
 * An <img> for the emoji when a sprite is bundled, else a text span —
 * callers get an illustrated glyph either way.
 */
export function pic(emoji: string, className = ""): HTMLElement {
  const src = SPRITES[emoji];
  if (!src) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = emoji;
    return span;
  }
  const img = document.createElement("img");
  img.className = className;
  img.src = src;
  img.alt = "";
  img.draggable = false;
  img.setAttribute("aria-hidden", "true");
  return img;
}
