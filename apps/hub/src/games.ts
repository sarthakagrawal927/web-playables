export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  status: "live" | "soon";
}

export const GAMES: GameMeta[] = [
  {
    id: "idle-startup",
    title: "Idle Startup",
    tagline: "Ship features. Hire the team. Raise the round.",
    emoji: "🚀",
    status: "live",
  },
  {
    id: "coming-soon",
    title: "Next game",
    tagline: "In the lab.",
    emoji: "🧪",
    status: "soon",
  },
];
