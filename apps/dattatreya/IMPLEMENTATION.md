# Terminal Portfolio - Implementation Details

## Overview
A Matrix-inspired terminal portfolio site built with Next.js 15, featuring a retro CRT aesthetic with modern AI capabilities.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 with custom CSS
- **AI Integration**: Vercel AI SDK with AI Gateway
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Port**: 7770

## Features Implemented

### Visual Design
- **CRT Effects**: 
  - Scanlines with animation
  - Screen flicker effect
  - Vignette (adjustable darkness)
  - Chromatic aberration (RGB shift)
  - Screen curvature with inset shadows
  - RGB scan line animation
  - Tron-style background grid (subtle green lines)

- **Neon Glow Effects**:
  - VSCode Neon-inspired text shadows
  - Adjustable glow intensity via `--glow-intensity` CSS variable
  - White core with colored falloff
  - Different glow colors for system (green) vs user input (yellow)

### Boot Sequence
1. Blinking cursor appears (no progress bar - confident loading)
2. Simulated system loading in background
3. Geolocation detection (via ipapi.co)
4. Typewriter effect for boot messages:
   - "connection established"
   - "you've found the terminal"
   - "another visitor from [CITY]"
   - "speak"

### Command System

#### Slash Commands
- `/help` - List all available commands
- `/about` - Personal introduction
- `/work` - Portfolio projects
- `/music` - Music showcase
- `/contact` - Contact information
- `/skills` - Technical skills with progress bars
- `/resume` - Resume download (PDF/TXT/JSON formats)
- `/themes` - (To be implemented)

#### Terminal Commands
- `clear` or `cls` - Clear terminal screen
- `ls`, `ls -la` - (To be implemented - will show esoteric file listings)

### Technical Architecture

#### Component Structure
```
/app
  /components
    Terminal.tsx         - Main terminal component
    CRTEffect.tsx       - Visual effects wrapper
    TerminalInput.tsx   - Input line with custom cursor
    TerminalHistory.tsx - Command/output display
    LoadingBar.tsx      - Terminal-style progress bar
  /hooks
    useBootSequence.ts   - Handles startup animation
    useGeolocation.ts    - Gets user location
    useCommandHistory.ts - Manages command history
  /lib
    commands.ts         - Command handlers
    geolocation.ts      - Server-side location fetch
```

#### Key Features
- Command history with localStorage persistence
- Arrow key navigation through previous commands
- Custom blinking block cursor (native cursor hidden)
- Placeholder text on first interaction only
- Server-side geolocation with Next.js

## Customization

### Glow Intensity
Adjust the neon glow effect by changing the CSS variable in `globals.css`:
```css
:root {
  --glow-intensity: 0.5; /* 0 = no glow, 1 = full neon */
}
```

### Color Scheme
- System output: `#00ff41` (phosphor green)
- User input: `#fde047` (yellow-green)
- Background: Pure black
- Grid lines: `rgba(0, 255, 65, 0.03)` (3% green)

## Future Implementations

### AI SDK Gateway Integration (Implemented)
- Natural conversation capabilities using AI SDK Gateway
- Context-aware responses via RAG
- Rate limiting with session tokens
- Geographic restrictions (US/Europe)
- Challenge questions for access control

### Esoteric File System (Implemented)
When users type `ls`, they see mystical and esoteric files:
```
> ls -la
drwxr-xr-x  21 root  wheel    672 Fri Jan 17 2025 .
drwxr-xr-x   3 root  wheel     96 Jan  1 1970 ..
drwx------   7 root  wheel    224 Dec 21 2012 .akashic-records/
-rw-------   1 root  wheel  13337 ??? ?? ???? .kundalini.lock
drwxr-xr-x  33 root  wheel   1056 Jul  7 7777 .chakra-system/
-rw-r--r--   1 root  wheel    108 Oct 13 0000 .third-eye.conf
drwxr-xr-x  12 root  wheel    384 Apr  1 2023 atlantis-archives/
-rwxr-xr-x   1 root  wheel   4096 Jun 21 2012 hyperborea-map.gpg
-rw-r--r--   1 root  wheel   1111 Nov 11 1111 tantra-protocols.md
drwxr-xr-x   8 root  wheel    256 Mar  3 0333 asana-sequences/
-rw-------   1 root  wheel   7777 Sep 23 2023 merkaba-activation.sh
drwxr-xr-x   5 root  wheel    160 Dec 25 0001 lemuria-fragments/
-rwxrwxrwx   1 root  wheel    432 Aug  8 1888 vimana-blueprints.enc
lrwxr-xr-x   1 root  wheel     42 Dec 31 1999 consciousness.ln -> /dev/null
-rw-r--r--   1 root  wheel   2012 Dec 21 2012 mayan-calendar.ics
drwx------   9 root  wheel    288 Feb 29 2020 sacred-geometry/
```

### Terminal Commands to Implement

#### File System Commands
- `pwd` - Shows mystical current location (e.g., `/home/consciousness/material-plane/`)
- `cd [dir]` - Navigate to esoteric directories
- `cat [file]` - Display mystical file contents
- `head/tail` - Show beginning/end of sacred texts
- `tree` - Display directory tree with ASCII art

#### System Information
- `whoami` - Returns philosophical answer about identity
- `uname -a` - Shows mystical system info
- `uptime` - Time since last enlightenment
- `date` - Shows cosmic calendar dates
- `cal` - Displays mystical calendar with moon phases

#### Process Management
- `ps` - Shows running consciousness processes
- `top` - Display active chakra energy levels
- `kill` - Terminate ego processes
- `jobs` - List parallel dimension tasks

#### Network Commands
- `ping` - Test connection to astral plane
- `traceroute` - Trace path through dimensions
- `netstat` - Show energy connections
- `ssh` - Connect to remote consciousness

#### File Manipulation
- `touch` - Create new reality files
- `mkdir` - Create dimensional folders
- `rm` - Remove karmic attachments
- `cp/mv` - Copy/move consciousness data
- `chmod` - Change reality permissions
- `chown` - Transfer cosmic ownership

#### Search and Text
- `grep` - Search through akashic records
- `find` - Locate lost artifacts
- `which` - Find path to enlightenment
- `whereis` - Locate mystical binaries
- `man` - Manual pages for reality

#### Archive and Compression
- `tar` - Archive ancient knowledge
- `gzip/gunzip` - Compress/expand consciousness
- `zip/unzip` - Pack/unpack dimensions

#### Fun Easter Eggs
- `fortune` - Mystical fortune telling
- `cowsay` - ASCII art with wisdom
- `sl` - Steam locomotive through dimensions
- `matrix` - Enter the matrix view
- `vim` - "Trapped in vim, seeking enlightenment"
- `emacs` - "The eternal editor of reality"
- `sudo` - "Requesting divine permissions..."
- `history` - Show past life commands
- `alias` - List reality shortcuts
- `export` - Set universal variables

### Theme System
Planned themes:
- **Matrix** (default): Green on black
- **Amber**: Classic amber phosphor
- **Blue**: IBM terminal blue
- **Light**: For accessibility
- **Synthwave**: Purple/pink neon

## Development Notes

### Running Locally
```bash
pnpm dev  # Runs on port 7770
```

### Git Remote
```bash
origin: https://github.com/gorkamolero/gorka.git
```

### Performance Considerations
- CRT effects use CSS animations for GPU acceleration
- Glow effects can be reduced for performance
- Command history limited to 50 entries
- Boot sequence uses minimal DOM updates

## Security Features (Planned)
- Rate limiting per session
- Geographic restrictions via Cloudflare Workers
- AI gatekeeper with challenge questions
- Progressive disclosure of features
- Session-based access tokens

## Database Integration (Future)
### /continue Command
- Save conversation state to database
- Allow users to continue previous sessions
- Implement with unique session IDs
- Store command history, AI context, and user progress