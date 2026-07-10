// Procedural cartoon avatars — seeded, so every teammate has a stable face
// and no image assets ship in the bundle (YT Playables forbids external
// requests; this generates thousands of distinct faces from code).

const SKIN = ["#ffd9b3", "#f3c19d", "#e0a97f", "#c68863", "#9c6644", "#7a4f33"];
const HAIR = [
  "#2f2a26",
  "#5b3a1e",
  "#8c5a2b",
  "#c98a3d",
  "#e8d48b",
  "#b5b5b5",
  "#e46a6a",
  "#7a5cff",
];
const SHIRT = ["#ff7ab8", "#5ea8ff", "#3ee089", "#ffc45e", "#a08bff", "#ff8f5e"];
const BG = ["#233054", "#2c2350", "#1e3a34", "#3a2e1e", "#3a1e33", "#1e2a3a"];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)] as T;
}

/** SVG markup for a 64×64 cartoon face. Same seed → same face, forever. */
export function avatarSvg(seed: number): string {
  const rand = mulberry32(seed);
  const skin = pick(rand, SKIN);
  const hair = pick(rand, HAIR);
  const shirt = pick(rand, SHIRT);
  const bg = pick(rand, BG);
  const hairStyle = Math.floor(rand() * 6); // 0 bald,1 short,2 curly,3 long,4 bun,5 spiky
  const glasses = rand() < 0.28;
  const beard = rand() < 0.22 && hairStyle !== 4;
  const happyEyes = rand() < 0.45;
  const grin = rand() < 0.5;
  const blush = rand() < 0.4;

  const parts: string[] = [];
  parts.push(`<circle cx="32" cy="32" r="30" fill="${bg}"/>`);
  // long hair sits behind the head
  if (hairStyle === 3) {
    parts.push(`<path d="M17 26 q15 -18 30 0 l1 22 q-16 8 -32 0 z" fill="${hair}"/>`);
  }
  // shirt
  parts.push(`<path d="M14 62 q18 -18 36 0 z" fill="${shirt}"/>`);
  // head + ears
  parts.push(`<circle cx="18.5" cy="31" r="3.4" fill="${skin}"/>`);
  parts.push(`<circle cx="45.5" cy="31" r="3.4" fill="${skin}"/>`);
  parts.push(`<circle cx="32" cy="30" r="14" fill="${skin}"/>`);
  // hair styles over the head
  if (hairStyle === 1) {
    parts.push(`<path d="M18 28 a14 14 0 0 1 28 0 q-3 -7 -14 -7 t-14 7 z" fill="${hair}"/>`);
  } else if (hairStyle === 2) {
    for (let i = 0; i < 5; i++) {
      const x = 20 + i * 6;
      parts.push(`<circle cx="${x}" cy="${19 - Math.sin(i / 4) * 2}" r="4.4" fill="${hair}"/>`);
    }
  } else if (hairStyle === 3) {
    parts.push(`<path d="M18 27 a14 14 0 0 1 28 0 q-2 -8 -14 -8 t-14 8 z" fill="${hair}"/>`);
  } else if (hairStyle === 4) {
    parts.push(`<circle cx="32" cy="13.5" r="5.5" fill="${hair}"/>`);
    parts.push(`<path d="M19 26 a14 14 0 0 1 26 0 q-1 -7 -13 -7 t-13 7 z" fill="${hair}"/>`);
  } else if (hairStyle === 5) {
    parts.push(
      `<path d="M19 25 l3 -8 3 6 3 -8 4 8 3 -7 3 7 3 -5 2 8 q-4 -5 -12 -5 t-12 4 z" fill="${hair}"/>`,
    );
  }
  // eyes
  if (happyEyes) {
    parts.push(
      `<path d="M24 29 q2.6 -3 5.2 0" stroke="#26221e" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      `<path d="M34.8 29 q2.6 -3 5.2 0" stroke="#26221e" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    );
  } else {
    parts.push(
      `<circle cx="26.6" cy="29" r="1.9" fill="#26221e"/>`,
      `<circle cx="37.4" cy="29" r="1.9" fill="#26221e"/>`,
    );
  }
  if (glasses) {
    parts.push(
      `<circle cx="26.6" cy="29" r="4.6" fill="none" stroke="#26221e" stroke-width="1.5"/>`,
      `<circle cx="37.4" cy="29" r="4.6" fill="none" stroke="#26221e" stroke-width="1.5"/>`,
      `<path d="M31.2 29 h1.6" stroke="#26221e" stroke-width="1.5"/>`,
    );
  }
  if (blush) {
    parts.push(
      `<circle cx="23.5" cy="34.5" r="2.2" fill="#ff7ab8" opacity="0.45"/>`,
      `<circle cx="40.5" cy="34.5" r="2.2" fill="#ff7ab8" opacity="0.45"/>`,
    );
  }
  // mouth
  if (grin) {
    parts.push(`<path d="M27 36.5 q5 5.5 10 0 z" fill="#26221e"/>`);
  } else {
    parts.push(
      `<path d="M27.5 37 q4.5 4 9 0" stroke="#26221e" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    );
  }
  if (beard) {
    parts.push(
      `<path d="M22 34 q1 8 10 8 t10 -8 q-2 10 -10 10 t-10 -10 z" fill="${hair}" opacity="0.9"/>`,
    );
  }

  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img">${parts.join("")}</svg>`;
}

/** Mount an avatar into a host element. */
export function renderAvatar(host: HTMLElement, seed: number): void {
  host.innerHTML = avatarSvg(seed);
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
