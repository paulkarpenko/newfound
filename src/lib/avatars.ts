import type { AvatarChoice, UserProfile } from './auth';

export interface AvatarPreset {
  id: string;
  label: string;
  /** CSS background — a gradient swatch. */
  background: string;
  /** Text color for the overlaid initials. */
  fg: string;
}

/** Curated swatches. Initials are always overlaid, so these read as
 *  "pick your color" rather than clip-art. */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'federal', label: 'Federal blue', background: 'linear-gradient(135deg, #2f5d97, #1c3a63)', fg: '#fff' },
  { id: 'parchment', label: 'Parchment', background: 'linear-gradient(135deg, #d6a857, #a25a25)', fg: '#fff' },
  { id: 'sage', label: 'Sage', background: 'linear-gradient(135deg, #6e7e6a, #46523f)', fg: '#fff' },
  { id: 'claret', label: 'Claret', background: 'linear-gradient(135deg, #c4663b, #7c2f1e)', fg: '#fff' },
  { id: 'slate', label: 'Slate', background: 'linear-gradient(135deg, #5c6b86, #353f54)', fg: '#fff' },
  { id: 'plum', label: 'Plum', background: 'linear-gradient(135deg, #876274, #4f3744)', fg: '#fff' },
];

const PRESET_INDEX = new Map(AVATAR_PRESETS.map((p) => [p.id, p]));

/** Deterministic fallback color for the 'initials' choice, hashed from a seed. */
const INITIALS_PALETTE: Array<{ background: string; fg: string }> = [
  { background: '#2f5d97', fg: '#fff' },
  { background: '#a25a25', fg: '#fff' },
  { background: '#6e7e6a', fg: '#fff' },
  { background: '#c4663b', fg: '#fff' },
  { background: '#5c6b86', fg: '#fff' },
  { background: '#876274', fg: '#fff' },
  { background: '#4f756f', fg: '#fff' },
  { background: '#7c5c46', fg: '#fff' },
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Two-letter initials from name (preferred) or username. */
export function initialsFor(profile: { name?: string; username: string }): string {
  const source = profile.name?.trim() || profile.username.trim();
  if (!source) return '?';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export interface AvatarVisual {
  background: string;
  fg: string;
  initials: string;
}

/** Resolve an avatar choice + profile into render-ready visual props. */
export function avatarVisual(
  avatar: AvatarChoice,
  profile: { name?: string; username: string },
): AvatarVisual {
  const initials = initialsFor(profile);
  if (avatar.startsWith('preset:')) {
    const preset = PRESET_INDEX.get(avatar.slice('preset:'.length));
    if (preset) return { background: preset.background, fg: preset.fg, initials };
  }
  // 'initials' (or unknown preset) → deterministic palette pick.
  const swatch = INITIALS_PALETTE[hashSeed(profile.username) % INITIALS_PALETTE.length];
  return { background: swatch.background, fg: swatch.fg, initials };
}

export function visualForProfile(profile: UserProfile): AvatarVisual {
  return avatarVisual(profile.avatar, profile);
}
