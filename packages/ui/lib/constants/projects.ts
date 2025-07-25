export interface Project {
  name: string;
  brief: string;
  description: string[];
  tech: string;
  link?: string;
  github?: string;
  images?: string[];
}

export const PROJECTS: Project[] = [
  {
    name: 'Degens in Space',
    brief: 'Blockchain-generated universe game',
    description: [
      'bitcoin rpg that shouldn\'t work but does',
      'turn-based pvp like classic pokémon',
      'multiple species, procedural universe',
      'the blockchain literally shapes reality',
      'play at degens.space'
    ],
    tech: 'Blockchain, procedural generation, game design',
    link: 'degens.space',
    github: 'ask-to-get-access',
    images: ['/images/degens-1.jpg', '/images/degens-2.jpg', '/images/degens-3.jpg']
  },
  {
    name: 'Cybertantra',
    brief: 'Command-line philosophical dialogue system',
    description: [
      'CLI interface for consciousness exploration',
      'Trained on tantra and philosophy',
      'RTT Yoga School teachings',
      'Digital philosopher & consciousness explorer'
    ],
    tech: 'Bun, AI SDK, Mastra, Claude Opus 4',
    github: 'github.com/gorkamolero/cybertantra',
    images: ['/images/cybertantra-demo.gif']
  },
  {
    name: 'Music Production',
    brief: 'Electronic music & Flamenco Cyberpunk',
    description: [
      'electronic music production and composition',
      'solo music',
      'flamenco cyberpunk isn\'t a genre yet',
      'but i\'m working on it'
    ],
    tech: 'Ableton, synthesis, production'
  },
  {
    name: 'The Pulse',
    brief: 'Non-linear storytelling engine',
    description: [
      'non-linear story engine',
      'separates structure from plot',
      'shadow over innsmouth was the test case',
      'voice dictation + generated imagery',
      'best thing i built that no one uses'
    ],
    tech: 'TypeScript, React, AI/ML',
    link: 'thepulse.app',
    github: 'github.com/gorkamolero/the-pulse',
    images: ['/images/The Pulse.jpeg']
  },
  {
    name: 'Codex',
    brief: 'Decode the past - ancient language translator',
    description: [
      'Translating ancient tantras and texts',
      'Currently working on Matangi Mahavidya',
      'Gemini for OCR (better than Claude 4!)',
      'Grok4 & Claude4 for translations'
    ],
    tech: 'Gemini OCR, Grok4/Claude4, AISDK',
    github: 'github.com/gorkamolero/codex'
  },
  {
    name: '777 Leftover Squawk',
    brief: 'Poetic dark horror radio - bhakti to Matangi',
    description: [
      'An experience: poetic, dark, horror, radio',
      'Built as bhakti (devotion) to Matangi',
      'Users submit stories to burn in the pile',
      'Music interrupted by darkness & poetry'
    ],
    tech: 'Next.js, Web Audio APIs, Redis playlists',
    link: '777leftoversquawk.vercel.app',
    images: ['/images/777LEFTOVERSQUAWK.jpeg']
  }
];