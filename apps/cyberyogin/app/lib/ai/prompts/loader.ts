import fs from 'fs';
import path from 'path';
import { MUSIC_TRACKS } from '../../constants/music';
import { ABOUT_TEXT, CONTACT_INFO, formatSkillsDisplay, RESUME_INFO } from '../../constants/portfolio';
import { PROJECTS } from '../../constants/projects';
import { THEME_NAMES } from '../../constants/themes';

export async function loadPrompt(promptName: string): Promise<string> {
  const promptPath = path.join(process.cwd(), 'app', 'lib', 'ai', 'prompts', `${promptName}.md`);
  let prompt = await fs.promises.readFile(promptPath, 'utf-8');
  
  // If loading digital-twin prompt, append the actual command data
  if (promptName === 'digital-twin') {
    const commandData = `

ACTUAL COMMAND DATA:

ABOUT:
${ABOUT_TEXT}

CONTACT:
Email:    ${CONTACT_INFO.email}
GitHub:   ${CONTACT_INFO.github}
Location: ${CONTACT_INFO.location}
Note:     ${CONTACT_INFO.note}

SKILLS:
${formatSkillsDisplay()}

MUSIC TRACKS:
${MUSIC_TRACKS.map((track, i) => `${i + 1}. ${track.name} - ${track.description}`).join('\n')}

WORK PROJECTS:
${PROJECTS.map(p => `- ${p.name}: ${p.brief} (${p.tech})${p.link ? ` - ${p.link}` : ''}${p.github ? ` - ${p.github}` : ''}`).join('\n')}

THEMES AVAILABLE:
${THEME_NAMES.join(', ')}

RESUME:
Current: ${RESUME_INFO.current}
Previous: ${RESUME_INFO.previous.join(', ')}
Formats available: ${RESUME_INFO.formats.join(', ')}

When users ask about these topics, use this exact data.`;

    prompt += commandData;
  }
  
  return prompt;
}