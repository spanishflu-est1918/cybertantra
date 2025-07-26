export interface Track {
  name: string;
  description: string;
  url: string;
  urls?: string[]; // For multiple tracks
}

export const MUSIC_TRACKS: Track[] = [
  { 
    name: 'Regret', 
    description: 'Melancholic piano piece',
    url: 'https://www.youtube.com/watch?v=Rrr-nNIdeJw'
  },
  { 
    name: 'Forget', 
    description: 'Contemplative piano journey',
    url: 'https://www.youtube.com/watch?v=y46tIeoIsPk'
  },
  { 
    name: 'Thumos', 
    description: 'Deep electronic exploration',
    url: 'https://www.youtube.com/watch?v=6ZfOfmvdHYM' 
  },
  { 
    name: 'Elohim', 
    description: 'Intense electronic meditation',
    url: 'https://www.youtube.com/watch?v=59Nh4q9XCyY' 
  },
  { 
    name: 'Gitano de Palo - Alaiar', 
    description: 'Flamenco Cyberpunk album',
    url: 'https://www.youtube.com/watch?v=w_pKfQrww-4' 
  },
  { 
    name: 'Gitano Plata o Plomo', 
    description: 'My favorite - collab with Gitano',
    url: 'https://www.youtube.com/watch?v=qlelOKM-lfc' 
  },
  { 
    name: 'Okano - Bamboo', 
    description: 'Early work from age 20',
    url: 'https://www.youtube.com/watch?v=v-996yzaTLg' 
  }
];

export const formatMusicDisplay = (): string => {
  return `╔═══════════════════════════════════════════╗
║              MUSIC                        ║
╚═══════════════════════════════════════════╝

♪ Loading discography...

${MUSIC_TRACKS.map((track, index) => 
`[${index + 1}] ${track.name}
    └─ ${track.description}
    └─ ${track.url}`
).join('\n\n')}

> Click any link to play`;
};