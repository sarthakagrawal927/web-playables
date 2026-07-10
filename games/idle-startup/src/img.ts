// Bundled illustrated emoji (Twemoji, CC BY 4.0 — attribution in README).
// Every sprite ships in the build: crisp everywhere, zero external requests,
// which is what YouTube Playables certification requires.

import artistPalette from "@twemoji/svg/1f3a8.svg";
import target from "@twemoji/svg/1f3af.svg";
import pool8 from "@twemoji/svg/1f3b1.svg";
import die from "@twemoji/svg/1f3b2.svg";
import trophy from "@twemoji/svg/1f3c6.svg";
import crane from "@twemoji/svg/1f3d7.svg";
import classical from "@twemoji/svg/1f3db.svg";
import office from "@twemoji/svg/1f3e2.svg";
import factory from "@twemoji/svg/1f3ed.svg";
import lightbulb from "@twemoji/svg/1f4a1.svg";
import collision from "@twemoji/svg/1f4a5.svg";
import dollar from "@twemoji/svg/1f4b5.svg";
import moneyWings from "@twemoji/svg/1f4b8.svg";
import chartUp from "@twemoji/svg/1f4c8.svg";
import clipboard from "@twemoji/svg/1f4cb.svg";
import ruler from "@twemoji/svg/1f4d0.svg";
import phone from "@twemoji/svg/1f4de.svg";
import megaphone from "@twemoji/svg/1f4e3.svg";
import box from "@twemoji/svg/1f4e6.svg";
import printer from "@twemoji/svg/1f5a8.svg";
import cardBox from "@twemoji/svg/1f5c2.svg";
import liberty from "@twemoji/svg/1f5fd.svg";
import couch from "@twemoji/svg/1f6cb.svg";
import tools from "@twemoji/svg/1f6e0.svg";
import technologist from "@twemoji/svg/1f9d1-200d-1f4bb.svg";
import briefcase from "@twemoji/svg/1f9d1-200d-1f4bc.svg";
import zen from "@twemoji/svg/1f9d8.svg";
import mage from "@twemoji/svg/1f9d9.svg";
import abacus from "@twemoji/svg/1f9ee.svg";
import toolbox from "@twemoji/svg/1f9f0.svg";
import fish from "@twemoji/svg/1f41f.svg";
import gem from "@twemoji/svg/1f48e.svg";
import microscope from "@twemoji/svg/1f52c.svg";
import handshake from "@twemoji/svg/1f91d.svg";
import cityDusk from "@twemoji/svg/1f306.svg";
import tree from "@twemoji/svg/1f333.svg";
import balloon from "@twemoji/svg/1f388.svg";
import turtle from "@twemoji/svg/1f422.svg";
import womanTech from "@twemoji/svg/1f469-200d-1f4bb.svg";
import fire from "@twemoji/svg/1f525.svg";
import rocket from "@twemoji/svg/1f680.svg";
import helicopter from "@twemoji/svg/1f681.svg";
import car from "@twemoji/svg/1f697.svg";
import robot from "@twemoji/svg/1f916.svg";
import chair from "@twemoji/svg/1fa91.svg";
import coin from "@twemoji/svg/1fa99.svg";
import plant from "@twemoji/svg/1fab4.svg";
import star from "@twemoji/svg/2b50.svg";
import hourglass from "@twemoji/svg/23f3.svg";
import zap from "@twemoji/svg/26a1.svg";
import cloud from "@twemoji/svg/2601.svg";
import coffee from "@twemoji/svg/2615.svg";
import scales from "@twemoji/svg/2696.svg";

/** emoji character → bundled sprite URL */
export const SPRITES: Record<string, string> = {
  "🎈": balloon,
  "📈": chartUp,
  "🎲": die,
  "🎯": target,
  "💥": collision,
  "💡": lightbulb,
  "💵": dollar,
  "💸": moneyWings,
  "📋": clipboard,
  "📣": megaphone,
  "📦": box,
  "📞": phone,
  "🔥": fire,
  "🔬": microscope,
  "🖨️": printer,
  "🗂️": cardBox,
  "🗽": liberty,
  "🌆": cityDusk,
  "🌳": tree,
  "🐟": fish,
  "🐢": turtle,
  "👩‍💻": womanTech,
  "💎": gem,
  "🚀": rocket,
  "🚁": helicopter,
  "🚗": car,
  "🛋️": couch,
  "🛠️": tools,
  "🎨": artistPalette,
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
  "🧑‍💼": briefcase,
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
