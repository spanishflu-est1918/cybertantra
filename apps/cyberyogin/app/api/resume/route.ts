import { NextResponse } from "next/server";

const RESUME_DATA = {
  name: "Gorka",
  title: "Engineer, Builder, Reality Hacker",
  location: "Madrid / Lisbon / Remote",
  contact: {
    github: "github.com/gorkamolero",
    studio: "bravura.studio",
    email: "contact@gorka.dev",
  },
  summary:
    "Full-Stack Engineer with expertise in modern web technologies, AI integration, and creative coding. Passionate about building elegant solutions that bridge technology and human experience. Active in the music production scene as co-founder of QTZL netlabel, exploring the intersection of code, art, and sound.",
  experience: [
    {
      title: "Web Developer",
      company: "Roadie",
      period: "December 2023 - Present",
      description: [
        "Working with the Roadie team on transforming their site into a striking Backstage platform",
        "Implementing modern UI patterns and performance optimizations",
        "Collaborating with distributed team across multiple time zones",
      ],
    },
    {
      title: "Software Engineer",
      company: "Typeshare.co",
      period: "November 2022 - December 2023",
      description: [
        "Led development of AI-first 2.0 version for online writers platform",
        "Managed UI architecture and text editor implementation using Tiptap",
        "Integrated AI features for content generation and optimization",
      ],
    },
    {
      title: "Co-founder & CTO",
      company: "Maility",
      period: "November 2022 - Present",
      description: [
        "Co-founded and served as technical lead for email automation startup",
        "Grew company to 20K MRR within 6 months",
        "Built scalable architecture and led technical strategy",
      ],
    },
    {
      title: "Web Developer & Design System Lead",
      company: "Chessable (Play Magnus Group)",
      period: "September 2020 - August 2022",
      description: [
        "Led high-performing remote team to build complete design system",
        "Worked on chess learning platform founded by Magnus Carlsen",
        "Implemented component library and established UI standards",
      ],
    },
    {
      title: "CTO",
      company: "Adalab",
      period: "October 2019 - August 2020",
      description: [
        "Led technology for NGO offering front-end bootcamp for women",
        "Built platform for candidates and employment matching system",
        "Implemented solution using React, Firebase, and no-code tools",
      ],
    },
  ],
  skills: {
    stack: [
      "Next.js",
      "Vercel",
      "Convex DB / PostgreSQL",
      "Drizzle ORM",
      "Bun > Node.js",
      "shadcn/ui + Tailwind",
    ],
    ai: [
      "Vercel AI SDK",
      "Mastra / CrewAI for agents",
      "Claude (Opus/Sonnet) > all",
      "Grok for X/Twitter context",
      "Kimi K2 (testing)",
      "NOT OpenAI",
    ],
    tools: [
      "Claude Code",
      "Opencode + Zed Editor",
      "NOT Cursor/Windsurf",
      "Git",
      "Vercel CI/CD",
    ],
    creative: ["Ableton Live", "Max/MSP", "Music Production"],
  },
  projects: [
    {
      name: "QTZL (Quetzalcoatl)",
      description:
        "Co-founded netlabel promoting Latin American electronic artists. Featured in Vice, Redbull Music, BBC4",
      tech: ["Next.js", "Vercel", "Music Distribution"],
    },
    {
      name: "Maility (20K MRR)",
      description:
        "Email automation SaaS built from scratch. Scaled to 20K MRR in 6 months as technical co-founder",
      tech: ["Next.js", "Convex DB", "Vercel AI SDK"],
    },
    {
      name: "Responsive Design Thought Leadership",
      description:
        "Published articles featured in Hacker News, Awwwards, Codrops. Still relevant after years",
      tech: ["Technical Writing", "Web Standards", "Design Philosophy"],
    },
  ],
  interests: [
    "X/Twitter + TPOT",
    "Music Production & DJing",
    "Chess",
    "Brazilian Jiu-Jitsu & Boxing",
    "Philosophy & Meditation",
    "Crypto/Web3",
    "AI/AGI discourse",
    "Post-rationalist thought",
  ],
  education: [
    {
      degree: "General Film Studies",
      institution:
        "ECAM - Escuela de Cinematografía y del Audiovisual de Madrid",
      year: "2010",
      focus: "Specialization in Sound Engineering and Mixing",
    },
    {
      degree: "Cinema, Photography and Film Production",
      institution:
        "ESCAC - Escola Superior de Cinema i Audiovisuals de Catalunya",
      year: "2009",
    },
  ],
  training: [
    "Client Ascension (2022-Present)",
    "Responsive Typography - Workshop with Jordan Moore",
    "Multi-device Web - Workshop with Luke Wroblewski",
    "An Event Apart - Conferences with Ethan Marcotte, Karen McGrane, Jeffrey Zeldman",
    "Responsive Design Workshops - Brad Frost, Andy Clarke",
    "Smashing Conference - Christian Heilmann, Jonathan Snook",
  ],
};

function generateTextResume() {
  let text = `GORKA
${RESUME_DATA.title}
${RESUME_DATA.location}

CONTACT
GitHub: ${RESUME_DATA.contact.github}
Studio: ${RESUME_DATA.contact.studio}

SUMMARY
${RESUME_DATA.summary}

EXPERIENCE
`;

  RESUME_DATA.experience.forEach((job) => {
    text += `\n${job.title} | ${job.company}
${job.period}
${job.description.map((d) => `• ${d}`).join("\n")}
`;
  });

  text += `\nTECH STACK & PREFERENCES

Preferred Stack:
${RESUME_DATA.skills.stack.map((s) => `• ${s}`).join("\n")}

AI/ML Tools:
${RESUME_DATA.skills.ai.map((s) => `• ${s}`).join("\n")}

Development Environment:
${RESUME_DATA.skills.tools.map((s) => `• ${s}`).join("\n")}

Creative:
${RESUME_DATA.skills.creative.map((s) => `• ${s}`).join("\n")}

PROJECTS
`;

  RESUME_DATA.projects.forEach((project) => {
    text += `\n${project.name}
${project.description}
`;
  });

  text += `\nINTERESTS
${RESUME_DATA.interests.join(", ")}

EDUCATION
`;

  RESUME_DATA.education.forEach((edu) => {
    text += `\n${edu.degree}
${edu.institution}, ${edu.year}
${edu.focus ? edu.focus : ""}
`;
  });

  text += `\nPROFESSIONAL DEVELOPMENT
${RESUME_DATA.training.join("\n")}`;

  return text;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  switch (format) {
    case "txt":
      return new NextResponse(generateTextResume(), {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": 'attachment; filename="gorka_resume.txt"',
        },
      });

    case "json":
    default:
      return NextResponse.json(RESUME_DATA);
  }
}
