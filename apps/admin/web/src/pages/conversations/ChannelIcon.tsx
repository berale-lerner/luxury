import type { ChannelName } from '../../types';

/**
 * The platform a conversation arrived on.
 *
 * Drawn as inline SVG rather than loaded from an icon set: three glyphs do
 * not justify a dependency, and the artifact is that these inherit the
 * surrounding colour and scale with the text they sit beside.
 *
 * Each keeps its platform's own colour, because that is what makes the list
 * scannable at a glance — the manager recognises the badge before reading
 * the name.
 */

const PATHS: Record<ChannelName, { path: string; color: string; label: string }> = {
  telegram: {
    label: 'טלגרם',
    color: '#229ED9',
    path: 'M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.78 8.7-7.86c.38-.34-.08-.53-.59-.19l-10.75 6.77-4.63-1.45c-1.01-.31-1.03-1 .21-1.48L20.63 3.1c.84-.31 1.57.19 1.31 1.5Z',
  },
  whatsapp: {
    label: 'וואטסאפ',
    color: '#25D366',
    path: 'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.25.69-1.45 1.32-1.99 1.36-.53.05-1.03.24-3.47-.72-2.92-1.15-4.77-4.13-4.91-4.32-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.11 1-2.4.26-.29.57-.36.76-.36l.55.01c.17.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.1.19-.15.31-.29.47-.14.17-.3.37-.43.5-.14.14-.29.29-.12.57.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.85.92-1.14.19-.29.38-.24.65-.14.26.09 1.67.79 1.96.93.29.14.48.21.55.33.07.12.07.69-.18 1.38Z',
  },
  instagram: {
    label: 'אינסטגרם',
    color: '#E1306C',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32Zm0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Zm5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0Z',
  },
};

export function ChannelIcon({ channel, size = 18 }: { channel: ChannelName; size?: number }) {
  const icon = PATHS[channel];
  if (!icon) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={icon.color}
      role="img"
      aria-label={icon.label}
      style={{ flexShrink: 0 }}
    >
      <title>{icon.label}</title>
      <path d={icon.path} />
    </svg>
  );
}

export function channelLabel(channel: ChannelName): string {
  return PATHS[channel]?.label ?? channel;
}
