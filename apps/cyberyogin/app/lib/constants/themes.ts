export type Theme = 'original' | 'solar' | 'lunar' | 'cobalt' | 'outrun';

export interface ThemeConfig {
  name: string;
  loadingMessage: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    input: string;
    cursor: string;
    selection: string;
    error: string;
    glow: string;
  };
}

export const THEMES: Record<Theme, ThemeConfig> = {
  original: {
    name: 'Original',
    loadingMessage: 'Loading original...',
    colors: {
      primary: '#00ff41',
      secondary: '#008f11',
      background: '#0d0208',
      surface: '#1a1a1a',
      text: '#00ff41',
      input: '#ffff00',
      cursor: '#00ff41',
      selection: 'rgba(0, 255, 65, 0.3)',
      error: '#ff0040',
      glow: 'rgba(0, 255, 65, 0.5)',
    },
  },
  solar: {
    name: 'Solar',
    loadingMessage: 'Loading skyfather...',
    colors: {
      primary: '#ffb000',
      secondary: '#cc8800',
      background: '#1a0f00',
      surface: '#2a1a00',
      text: '#ffb000',
      input: '#ffe000',
      cursor: '#ffb000',
      selection: 'rgba(255, 176, 0, 0.3)',
      error: '#ff6600',
      glow: 'rgba(255, 176, 0, 0.5)',
    },
  },
  lunar: {
    name: 'Lunar',
    loadingMessage: 'Loading divine feminine...',
    colors: {
      primary: '#ffffff',
      secondary: '#888888',
      background: '#000000',
      surface: '#111111',
      text: '#ffffff',
      input: '#ffffff',
      cursor: '#ffffff',
      selection: 'rgba(255, 255, 255, 0.2)',
      error: '#ffffff',
      glow: 'rgba(255, 255, 255, 0.5)',
    },
  },
  cobalt: {
    name: 'Cobalt',
    loadingMessage: 'Loading cobalt...',
    colors: {
      primary: '#00ddff',
      secondary: '#0099cc',
      background: '#000814',
      surface: '#001a2a',
      text: '#00ddff',
      input: '#ffffff',
      cursor: '#00ddff',
      selection: 'rgba(0, 221, 255, 0.3)',
      error: '#ff0066',
      glow: 'rgba(0, 221, 255, 0.5)',
    },
  },
  outrun: {
    name: 'Outrun',
    loadingMessage: 'Loading outrun...',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      background: '#0a0014',
      surface: '#1a0a2a',
      text: '#ff00ff',
      input: '#00ffff',
      cursor: '#ff00ff',
      selection: 'rgba(255, 0, 255, 0.2)',
      error: '#ff0080',
      glow: 'rgba(255, 0, 255, 0.3)',
    },
  },
};

export const THEME_NAMES = Object.keys(THEMES) as Theme[];