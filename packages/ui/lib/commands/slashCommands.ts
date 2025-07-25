type CommandOutput = string | { content: string; typewriter: boolean };
type CommandHandler = (args: string[]) => CommandOutput;

const commands: Record<string, CommandHandler> = {
  "/help": () => "SHOW_HELP_BROWSER",

  "/about": () => ({
    content: `
> gorka

i build things
sometimes they're useful

i get obsessed
disappear into projects for days
emerge with something
sometimes with nothing

then i switch contexts
explore something else
the cycle continues
`,
    typewriter: true,
  }),

  "/work": () => "SHOW_WORK_BROWSER",

  "/music": () => "SHOW_MUSIC_PLAYER",

  "/contact": () => ({
    content: `
╔═══════════════════════════════════════════╗
║        ESTABLISH CONNECTION               ║
╚═══════════════════════════════════════╝

> Opening secure channels...

Email:    gorka.molero@gmail.com
GitHub:   github.com/gorkamolero
Location: Madrid / Lisbon / US

> Professional inquiries welcome
> Consulting opportunities available

> Type /work for project details
> Or just start chatting
`,
    typewriter: true,
  }),

  "/skills": () => ({
    content: `
╔═══════════════════════════════════════════╗
║       TECH STACK & PREFERENCES            ║
╚═══════════════════════════════════════════╝

PREFERRED STACK:
  [████████████████████] Next.js
  [████████████████████] Vercel
  [████████████████████] Convex DB / PostgreSQL
  [████████████████░░░░] Drizzle ORM
  [██████████████████░░] Bun > Node.js
  [████████████████████] shadcn/ui + Tailwind

AI/ML TOOLS:
  [████████████████████] Vercel AI SDK
  [████████████████░░░░] Mastra / CrewAI for agents
  [████████████████████] Claude (Opus/Sonnet) > all
  [██████████████░░░░░░] Grok for X/Twitter context
  [████████████░░░░░░░░] Kimi K2 (testing)
  [░░░░░░░░░░░░░░░░░░░░] OpenAI

DEV ENVIRONMENT:
  [████████████████████] Claude Code
  [████████████████████] Opencode + Zed Editor
  [░░░░░░░░░░░░░░░░░░░░] Cursor/Windsurf

CREATIVE:
  [████████████████████] Ableton Live
  [████████████████░░░░] Max/MSP
  [████████████████████] Music Production

> Strong opinions, loosely held (but mostly strong)
`,
    typewriter: true,
  }),

  "/resume": () => "SHOW_RESUME_BROWSER",

  "/themes": (args) => {
    if (args.length === 0) {
      return "SHOW_THEME_BROWSER";
    }
    return `CHANGE_THEME:${args[0]}`;
  },

  "/theme": (args) => {
    if (args.length === 0) {
      return "SHOW_THEME_BROWSER";
    }
    return `CHANGE_THEME:${args[0]}`;
  },
};

export function slashCommands(
  command: string,
  args: string[],
): string | { content: string; typewriter: boolean } {
  if (command === "/resume" && args.length > 0) {
    const format = args[0].toLowerCase();
    switch (format) {
      case "pdf":
        return `
> Initiating download: gorka_molero_resume.pdf
> Format: PDF (Professional Layout)

[!] PDF generation in progress...
[!] For now, try: /resume txt or /resume json
`;
      case "txt":
        return `
> Generating plain text resume...
> Accessing /api/resume?format=txt...

════════════════════════════════════════════

GORKA MOLERO
Engineer, Builder, Reality Hacker
Madrid / Lisbon / Remote

CONTACT
GitHub: github.com/gorkamolero
Studio: bravura.studio

SUMMARY
Full-Stack Engineer with expertise in modern web
technologies, AI integration, and creative coding.
Passionate about building elegant solutions that
bridge technology and human experience.

RECENT EXPERIENCE

Web Developer | Roadie
Dec 2023 - Present
• Building striking Backstage platform
• Modern UI patterns & performance optimization

Software Engineer | Typeshare.co
Nov 2022 - Dec 2023
• Led AI-first 2.0 version development
• Managed UI architecture with Tiptap editor

Co-founder & CTO | Maility
Nov 2022 - Present
• Grew to 20K MRR in 6 months
• Built scalable email automation platform

TECH STACK
• Next.js + Vercel
• Convex DB / PostgreSQL + Drizzle
• Bun > Node.js
• shadcn/ui + Tailwind
• Claude Code + Zed
• Vercel AI SDK + Mastra/CrewAI
• Claude > Grok > Kimi > OpenAI

INTERESTS
X/Twitter + TPOT, Music Production, Chess,
BJJ/Boxing, Philosophy, Crypto, AI/AGI

════════════════════════════════════════════

> Full resume: curl ${typeof window !== "undefined" ? window.location.origin : ""}/api/resume?format=txt
`;
      case "json":
        return `
> Exporting resume data as JSON...
> Accessing /api/resume?format=json...

{
  "name": "Gorka Molero",
  "title": "Senior Full-Stack Engineer & Digital Creator",
  "location": "Madrid, Spain",
  "contact": {
    "github": "github.com/gorkamolero",
    "studio": "bravura.studio"
  },
  "experience": [
    {
      "title": "Senior UI Engineer",
      "company": "Current Company",
      "period": "2022 - Present"
    },
    {
      "title": "Creative Technologist",
      "company": "Bravura Studio",
      "period": "2018 - Present"
    }
  ],
  "stack": [
    "Next.js + Vercel",
    "Convex DB / PostgreSQL",
    "Bun > Node.js",
    "Claude Code (NOT Cursor)"
  ],
  "ai_preferences": {
    "preferred": "Claude (Opus/Sonnet)",
    "testing": "Kimi K2",
    "avoid": "OpenAI (if possible)"
  }
}

> Full JSON: curl ${typeof window !== "undefined" ? window.location.origin : ""}/api/resume
`;
      default:
        return `Unknown format: ${format}\nAvailable formats: pdf, txt, json`;
    }
  }

  if (command in commands) {
    return commands[command](args);
  }

  return "";
}
