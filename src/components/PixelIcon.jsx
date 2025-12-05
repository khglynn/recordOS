/**
 * ============================================================================
 * PIXEL ICON COMPONENT
 * ============================================================================
 *
 * Renders pixelarticons SVGs with our green terminal color.
 * Icons use currentColor, so they inherit the text color.
 *
 * Usage: <PixelIcon name="music" size={16} />
 */

import styled from 'styled-components';

// Icon name to filename mapping
// Some icons have different names than what we'd naturally call them
const ICON_MAP = {
  // Media
  music: 'music',
  play: 'play',
  pause: 'pause',
  next: 'next',
  prev: 'prev',
  volume: 'volume-2',
  volumeMute: 'volume-x',
  volumeLow: 'volume-1',
  volumeHigh: 'volume-3',
  speaker: 'speaker',
  playlist: 'playlist',

  // Games
  gamepad: 'gamepad',
  zap: 'zap', // For minesweeper/bomb

  // Navigation/UI
  close: 'close',
  minus: 'minus',
  info: 'info-box',
  calendar: 'calendar',
  logout: 'logout',
  login: 'login',
  power: 'power',
  link: 'link',
  externalLink: 'external-link',

  // Files/Data
  disc: 'coin', // Closest to a record/disc
  folder: 'folder',
  file: 'file',

  // Misc
  user: 'user',
  heart: 'heart',
  dollar: 'dollar',
  gift: 'gift',
  monitor: 'monitor',
  command: 'command',
  alert: 'alert',
  repeat: 'repeat', // For "all" / infinity
  sync: 'sync',
  reload: 'reload',
};

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  color: ${props => props.$color || '#00ff41'};

  svg {
    width: 100%;
    height: 100%;
  }
`;

// Cache for loaded SVGs
const svgCache = new Map();

// Load SVG content
const loadSvg = async (iconName) => {
  const fileName = ICON_MAP[iconName] || iconName;

  if (svgCache.has(fileName)) {
    return svgCache.get(fileName);
  }

  try {
    // Import SVG as raw text
    const svgModule = await import(`../../node_modules/pixelarticons/svg/${fileName}.svg?raw`);
    const svgContent = svgModule.default;
    svgCache.set(fileName, svgContent);
    return svgContent;
  } catch (err) {
    console.warn(`PixelIcon: Could not load icon "${iconName}" (${fileName}.svg)`);
    return null;
  }
};

import { useState, useEffect } from 'react';

function PixelIcon({ name, size = 24, color, className, style }) {
  const [svgContent, setSvgContent] = useState(null);

  useEffect(() => {
    let mounted = true;

    loadSvg(name).then((content) => {
      if (mounted && content) {
        setSvgContent(content);
      }
    });

    return () => { mounted = false; };
  }, [name]);

  if (!svgContent) {
    // Return empty placeholder while loading
    return <IconWrapper $size={size} $color={color} className={className} style={style} />;
  }

  return (
    <IconWrapper
      $size={size}
      $color={color}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

export default PixelIcon;

// Also export a simple list of available icon names for reference
export const AVAILABLE_ICONS = Object.keys(ICON_MAP);
