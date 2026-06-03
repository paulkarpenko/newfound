import { avatarVisual } from '@/lib/avatars';
import type { AvatarChoice } from '@/lib/auth';

interface Props {
  avatar: AvatarChoice;
  profile: { name?: string; username: string };
  size?: number;
  /** Ring around the avatar (used for the active/selected state). */
  ring?: boolean;
}

/** Renders an avatar as a colored disc with overlaid initials. */
export default function Avatar({ avatar, profile, size = 32, ring }: Props) {
  const v = avatarVisual(avatar, profile);
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: v.background,
        color: v.fg,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontWeight: 600,
        fontSize: Math.round(size * 0.4),
        letterSpacing: '0.02em',
        userSelect: 'none',
        boxShadow: ring ? '0 0 0 2px var(--nf-panel), 0 0 0 4px var(--nf-focus)' : 'none',
        flexShrink: 0,
      }}
    >
      {v.initials}
    </span>
  );
}
