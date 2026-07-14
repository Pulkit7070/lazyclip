// Freemium: every user gets FREE_LIMIT generations, then must spend credits.
export const FREE_LIMIT = 5;
// Waitlist members who sign in get founding-creator bonus credits.
export const FOUNDING_CREDITS = 20;

// Credit packs (paid). 1 credit = 1 generation. Priced $2–$5, buy what you need.
export const PACKS = [
  { id: "starter", label: "Starter", credits: 20, amountUsd: 2 },
  { id: "creator", label: "Creator", credits: 60, amountUsd: 5 },
] as const;

export type PackId = (typeof PACKS)[number]["id"];
export const packById = (id: string) => PACKS.find((p) => p.id === id);
