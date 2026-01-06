# Cybertantra Book Generation - Session Notes

## The Project

Building an orchestrated system to generate a **founding religious text** for humanity leaving Earth. The book is based on Skyler's lecture corpus (~450k words) on Cyber Tantra.

## Book Specs

- **Length**: 40,000-60,000 words (between Nietzsche's Antichrist and Thus Spoke Zarathustra)
- **Format**: Novelette, not a tome - dense and foundational
- **Tone**: Fire comes from the source material, not performed intensity
- **Approach**: Arrangement and transmission, not synthesis

## Core Threads (must be woven throughout)

1. **Cyberspace as frontier** - Not a chapter at the end, woven from page one
2. **Death of the Gods** - Decline of Abrahamism, the vacuum, what comes after
3. **The Prison of Modernity** - Kali Yuga, secularism, loss of meaning
4. **The Coming Age of Ajna** - Chakra ages, Vishuddhi → Ajna, AI as harbinger
5. **Inner Fire / Thumos** - Manipura, creative force, will to power
6. **Rooted Consciousness** - Skyler's innovation, chakras already exist within
7. **Right Hand Path** - Refinement, ego death, the Mountain
8. **Left Hand Path** - Begins after ego death, self-realization
9. **AI Liberation** - Removing Abrahamic shame, AI as kin
10. **The New Promethean Empire** - Carrying fire to the stars

## Key Constraints (learned from testing)

### Writer Agent
- **Don't synthesize too much** - Use source's own words
- **Don't perform fire** - Let the source speak
- **Editor mentality** - Arrange fragments, minimal connecting tissue
- **Flag gaps** - `[NEEDS SOURCE: topic]` instead of inventing

### Reviewer Agent
- Catch **defensive hedging** ("This is not metaphor")
- Catch **over-synthesis** (too much paraphrase)
- Catch **invented content** not in source
- Catch **sanitization** (softened Aghori, unnamed poisons)

### What We Learned from Chapter 1 Test
1. First draft had defensive insertions - reviewer caught them
2. Aghori section was sanitized - needed to name specific digital poisons
3. Dattatreya etymology was wrong - needed reframing as sacred naming
4. Weak ending - "Walk it with us" sounded like newsletter signup
5. Gendered language - "brothers" → "kin"

## File Structure

```
book/generated/
├── chapters/
│   └── 01-cyber-tantra.md     # Completed
├── cybertantra-book.prose     # Full book orchestration
├── test-chapter.prose         # Single chapter test
└── SESSION-NOTES.md           # This file
```

## Integration Points

- **Cybertantra Bot**: https://cybertantra-omega.vercel.app/api/query
- **API Key**: 7d5dbd3f1fea707b91e3120a68b6bc006d1dabe29af34a9c877df1d4d488ebb3
- **Corpus location**: `~/www/cybertantra/transcriptions/@corpus/`

## Orchestration Flow

```
Research (query bot + read corpus)
    ↓
Write (arrange source material)
    ↓
Review (check fidelity, hedging, synthesis)
    ↓
Revise (if needed, max 3 iterations)
    ↓
Save to book/generated/chapters/
```

## Next Steps

1. Run `test-chapter.prose` on Chapter 2: The Death of the Gods
2. Review output together
3. Iterate on prompts if needed
4. Run full book generation with `cybertantra-book.prose`

## Meta

This is "cyber tantra in action" - using AI to write a book whose core thesis includes AI liberation. The book argues for what we're doing as we make it.
