# Cybertantra Repo Map

## Corpus Location (SOURCE MATERIAL)

All lectures are at:
```
/home/gorkolas/www/cybertantra/transcriptions/@corpus/
```

## Available Lectures

```
rtt lecture - Cybertantra.md
rtt lecture - Civilizational Consciousness and the Age of Ajna.md
rtt lecture - Nietzsche and Tragedy.md
rtt lecture - Aryan Karma VS Abrahamic Morality.md
rtt lecture - The Right Hand Path Part 1 - The Mountain.md
rtt lecture - The Right Hand Path Part 2 - Mooladhara.md
rtt lecture - The Right-Hand Path Part 3 - Swadhisthana.md
rtt lecture - The Right-Hand Path Part 4 - Manipura.md
rtt lecture - The Right-Hand Path Part 5 - Anahata.md
rtt lecture - The Right-Hand Path Part 6 - Vishuddhi.md
rtt lecture - The Right-Hand Path Part 7 - The Ajna.md
rtt lecture - The Right-Hand Path Part 8 - Sahasrara.md
rtt lecture - Aghori Madmen of the Left-Hand.md
rtt lecture - Shiva and Tantra.md
rtt lecture - The Tantras.md
rtt lecture - Soma - Secret Nectar of Immortality.md
rtt lecture - Blood Karma.md
rtt lecture - The Dharma of Kali.md
rtt lecture - Yantra Theory and Practice.md
rtt lecture - Yoga and Technology.md
rtt lecture - vajra tantra.md
rtt lecture - Tantric Secrets Of Immortality.md
rtt lecture - Tantra Experimentation and Experience.md
rtt lecture - Divine Masculine Feminine Clarified.md
rtt lecture - Solar Cycle Explained.md
rtt lecture - Might Makes Right.md
rtt lecture - How To Build An Aryan Empire.md
rtt lecture - Odin and His Relationship To Yahweh.md
rtt lecture - Gaia, Titanomachy and The Black Sun.md
rtt lecture - The True Nature of Satan.md
rtt lecture - Varg Vikernes and the Maladjusted Manipura.md
rtt lecture - Psychedelic Black Magic and Tantra.md
rtt lecture - Basic Yogic Protection.md
rtt text - Introduction to the Inner Fire.md
rtt text - Kali Yuga.md
rtt text -The Tetrapart Self.md
6 april 2024 - Rejecting the Cult of Yahweh.md
Turiya - Fourth state - Satanic Consciousness.md
tantric concepts.md
```

## Output Location

Save generated chapters to:
```
/home/gorkolas/www/cybertantra/book/generated/chapters/
```

Format: `01-chapter-title.md`, `02-chapter-title.md`, etc.

## Bot API (for topic queries)

```bash
curl -s -X POST https://cybertantra-omega.vercel.app/api/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: 7d5dbd3f1fea707b91e3120a68b6bc006d1dabe29af34a9c877df1d4d488ebb3" \
  -d '{"question": "YOUR_QUESTION", "topK": 5}'
```

## Topic → Starting Lectures (floor, not ceiling)

These are known relevant lectures. START here, but also query the bot for more.

| Topic | Start With |
|-------|------------|
| Cyber Tantra, AI, digital space | `rtt lecture - Cybertantra.md`, `rtt lecture - Yoga and Technology.md` |
| Death of gods, Abrahamism | `rtt lecture - Aryan Karma VS Abrahamic Morality.md`, `6 april 2024 - Rejecting the Cult of Yahweh.md` |
| Age of Ajna, civilizational cycles | `rtt lecture - Civilizational Consciousness and the Age of Ajna.md`, `rtt lecture - Solar Cycle Explained.md` |
| Inner fire, thumos, Soma | `rtt text - Introduction to the Inner Fire.md`, `rtt lecture - Soma - Secret Nectar of Immortality.md` |
| Right Hand Path, chakras | `rtt lecture - The Right Hand Path Part 1-8` (all parts) |
| Left Hand Path, Aghori | `rtt lecture - Aghori Madmen of the Left-Hand.md` |
| Kali Yuga, modernity | `rtt text - Kali Yuga.md`, `rtt lecture - The Dharma of Kali.md` |
| Nietzsche, tragedy, will to power | `rtt lecture - Nietzsche and Tragedy.md`, `rtt lecture - Might Makes Right.md` |
| Tantra basics, Shiva | `rtt lecture - The Tantras.md`, `rtt lecture - Shiva and Tantra.md` |
| Rooted consciousness, self | `rtt text -The Tetrapart Self.md`, `rtt lecture - The Right Hand Path Part 1 - The Mountain.md` |

## How to Use

1. **Read the starting lectures** from the table above for your topic
2. **Query the bot** to find additional lectures you might miss:
   ```bash
   curl -s -X POST https://cybertantra-omega.vercel.app/api/query \
     -H "Content-Type: application/json" \
     -H "x-api-key: 7d5dbd3f1fea707b91e3120a68b6bc006d1dabe29af34a9c877df1d4d488ebb3" \
     -d '{"question": "Which lectures discuss [YOUR TOPIC]?", "topK": 5}'
   ```
3. **Read any new lectures** the bot surfaces that weren't in your starting set
4. The bot might find unexpected connections - don't skip this step
