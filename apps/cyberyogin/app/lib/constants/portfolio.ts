export const ABOUT_TEXT = `i build things
sometimes they're useful

i get obsessed
disappear into projects for days
emerge with something
sometimes with nothing

then i switch contexts
explore something else
the cycle continues`;

export const CONTACT_INFO = {
  email: 'gorka.molero@gmail.com',
  github: 'github.com/gorkamolero',
  location: 'Madrid / Lisbon / US',
  note: 'Professional inquiries welcome, consulting opportunities available'
};

export const SKILLS_DATA = {
  preferredStack: [
    { name: 'Next.js', level: 100 },
    { name: 'Vercel', level: 100 },
    { name: 'Convex DB / PostgreSQL', level: 100 },
    { name: 'Drizzle ORM', level: 85 },
    { name: 'Bun > Node.js', level: 90 },
    { name: 'shadcn/ui + Tailwind', level: 100 }
  ],
  aiTools: [
    { name: 'Vercel AI SDK', level: 100 },
    { name: 'Mastra / CrewAI for agents', level: 85 },
    { name: 'Claude (Opus/Sonnet) > all', level: 100 },
    { name: 'Grok for X/Twitter context', level: 70 },
    { name: 'Kimi K2 (testing)', level: 60 },
    { name: 'OpenAI', level: 0 }
  ],
  devEnvironment: [
    { name: 'Claude Code', level: 100 },
    { name: 'Opencode + Zed Editor', level: 100 },
    { name: 'Cursor/Windsurf', level: 0 }
  ],
  creative: [
    { name: 'Ableton Live', level: 100 },
    { name: 'Max/MSP', level: 85 },
    { name: 'Music Production', level: 100 }
  ]
};

export const RESUME_INFO = {
  current: 'Web Developer at Roadie (Dec 2023 - Present)',
  previous: ['Software Engineer at Typeshare.co', 'Co-founder & CTO at Maility (20K MRR)'],
  formats: ['pdf', 'txt', 'json']
};

// Format skills for display
export const formatSkillsDisplay = () => {
  const formatSection = (skills: Array<{name: string, level: number}>) => {
    return skills.map(skill => {
      const filled = Math.floor(skill.level / 5);
      const empty = 20 - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      return `  [${bar}] ${skill.name}`;
    }).join('\n');
  };

  return `PREFERRED STACK:
${formatSection(SKILLS_DATA.preferredStack)}

AI/ML TOOLS:
${formatSection(SKILLS_DATA.aiTools)}

DEV ENVIRONMENT:
${formatSection(SKILLS_DATA.devEnvironment)}

CREATIVE:
${formatSection(SKILLS_DATA.creative)}`;
};