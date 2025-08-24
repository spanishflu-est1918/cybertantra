# Meditation Generator System Design

## Word Pacing Analysis from Corpus

After analyzing the 31 meditation files in the corpus, I've identified key patterns for creating properly paced meditations.

## 1. Timing Mathematics

### Base Formula
```
Total Duration = Speaking Time + Pause Time + Silence Time

Speaking Rate: 120-150 words/minute (slow, meditative pace)
Pause Ratio: 40-60% of total time is silence
```

### Duration Breakdowns

#### 15-Minute Meditation
- **Total words**: 900-1200 words
- **Speaking time**: 7-8 minutes
- **Pause/silence time**: 7-8 minutes
- **Structure**:
  - Opening (2-3 min): 240-360 words
  - Main practice (10 min): 500-700 words
  - Closing (2-3 min): 160-240 words

#### 30-Minute Meditation
- **Total words**: 1800-2400 words
- **Speaking time**: 15-18 minutes
- **Pause/silence time**: 12-15 minutes
- **Structure**:
  - Opening (5 min): 500-600 words
  - Main practice (20 min): 1000-1400 words
  - Closing (5 min): 300-400 words

## 2. Pause Notation System

From the corpus, I've identified these pause markers:

```javascript
const pauseTypes = {
  '[pause]': 3-5 seconds,
  '[long pause]': 8-10 seconds,
  '[30 seconds silence]': 30 seconds,
  '[1 minute silence]': 60 seconds,
  '[bell]': 2 seconds + sound,
  '...': 2-3 seconds natural pause,
  '\n\n': Paragraph break, 3-4 seconds
};
```

## 3. Meditation Structure Templates

### Universal Structure Pattern
```markdown
1. GROUNDING (15-20% of total words)
   - Body awareness
   - Breath regulation
   - Tension release

2. INVOCATION (10-15% of total words)
   - Setting intention
   - Calling in the deity/energy
   - Creating sacred space

3. MAIN PRACTICE (50-60% of total words)
   - Visualization
   - Mantra repetition
   - Energy circulation
   - Deity meditation

4. INTEGRATION (10-15% of total words)
   - Absorbing the practice
   - Grounding the energy
   - Sealing the benefits

5. RETURN (5-10% of total words)
   - Coming back to body
   - Opening eyes
   - Final blessing
```

## 4. Word Distribution Algorithm

```typescript
interface MeditationSection {
  name: string;
  percentageOfTotal: number;
  wordCount: number;
  pauseMultiplier: number; // How many pauses relative to words
}

function calculateSections(totalMinutes: number): MeditationSection[] {
  const baseWords = totalMinutes * 60; // 60 words per minute base
  
  return [
    {
      name: 'grounding',
      percentageOfTotal: 0.20,
      wordCount: Math.floor(baseWords * 0.20),
      pauseMultiplier: 1.5 // More pauses for settling
    },
    {
      name: 'invocation',
      percentageOfTotal: 0.15,
      wordCount: Math.floor(baseWords * 0.15),
      pauseMultiplier: 1.2
    },
    {
      name: 'mainPractice',
      percentageOfTotal: 0.50,
      wordCount: Math.floor(baseWords * 0.50),
      pauseMultiplier: 0.8 // Fewer pauses, more flow
    },
    {
      name: 'integration',
      percentageOfTotal: 0.10,
      wordCount: Math.floor(baseWords * 0.10),
      pauseMultiplier: 2.0 // Long pauses for integration
    },
    {
      name: 'return',
      percentageOfTotal: 0.05,
      wordCount: Math.floor(baseWords * 0.05),
      pauseMultiplier: 1.0
    }
  ];
}
```

## 5. Content Generation Strategy

### Phase 1: Research (RAG from Lectures)
```typescript
// Extract deity/topic knowledge
const topics = [
  'symbolism and iconography',
  'mantras and bija sounds',
  'associated chakras',
  'traditional practices',
  'tantric significance',
  'elemental associations'
];

const knowledge = await gatherTopicKnowledge(deity, topics);
```

### Phase 2: Template Selection
```typescript
// Choose appropriate meditation style based on topic
const meditationStyles = {
  'deity': 'visualization + mantra',
  'chakra': 'energy circulation + color',
  'yoga_nidra': 'body scan + relaxation',
  'breath': 'pranayama + counting',
  'protection': 'shielding + grounding'
};
```

### Phase 3: Generation with Constraints
```typescript
const generateMeditation = async (config: MeditationConfig) => {
  const sections = calculateSections(config.duration);
  const knowledge = await extractKnowledge(config.topic);
  const templates = await loadTemplates(config.style);
  
  const prompt = `
    Generate a ${config.duration}-minute meditation on ${config.topic}.
    
    STRICT REQUIREMENTS:
    - Total words: ${sections.reduce((a, s) => a + s.wordCount, 0)}
    - Use these section word counts: ${JSON.stringify(sections)}
    - Include pause markers for timing
    - Use present tense, direct commands
    - Incorporate this knowledge: ${knowledge}
    
    SECTION BREAKDOWN:
    ${sections.map(s => `${s.name}: ${s.wordCount} words`).join('\n')}
    
    PAUSE RULES:
    - Add [pause] every 20-30 words
    - Add [long pause] between major sections
    - Add [30 seconds silence] for deep integration moments
  `;
  
  return await generateWithLLM(prompt);
};
```

## 6. Example Output Structure

```markdown
# Ucchishta Ganapati Meditation (15 minutes)
Total words: 1050 | Speaking time: 8 minutes | Silence: 7 minutes

## Opening [200 words]
Find a comfortable seated position, spine naturally erect.
[pause]
Close your eyes gently.
[pause]
Take three deep breaths, releasing all tension.
[long pause]

## Invocation [150 words]
We call upon Ucchishta Ganapati, the tantric form of Ganesha...
[pause]
Lord of thresholds and leftover energies...
[pause]

## Main Practice [550 words]
Visualize before you a deep blue-red form...
[pause]
Six arms extending from his elephant body...
[long pause]
In his trunk, he holds a pomegranate...
[30 seconds silence]

Begin the mantra: Om Ucchishta Ganapataye Namaha...
[1 minute silence for mantra repetition]

## Integration [100 words]
Allow the energy to settle into your being...
[long pause]
Feel the presence merging with your consciousness...
[30 seconds silence]

## Return [50 words]
Slowly bring awareness back to your breath...
[pause]
When ready, gently open your eyes.
[pause]
Om Gam Ganapataye Namaha.
```

## 7. Validation System

```typescript
interface MeditationValidator {
  checkWordCount(text: string, target: number): boolean;
  checkPauseTiming(text: string): number; // returns total pause seconds
  checkSectionBalance(text: string, sections: MeditationSection[]): boolean;
  estimateDuration(text: string): number; // returns minutes
}

function validateMeditation(text: string, targetMinutes: number): ValidationResult {
  const words = text.replace(/\[.*?\]/g, '').split(/\s+/).length;
  const pauses = extractPauses(text);
  const pauseSeconds = calculatePauseTime(pauses);
  const speakingMinutes = words / 130; // average pace
  const totalMinutes = speakingMinutes + (pauseSeconds / 60);
  
  return {
    valid: Math.abs(totalMinutes - targetMinutes) < 2, // 2 minute tolerance
    actualDuration: totalMinutes,
    wordCount: words,
    pauseTime: pauseSeconds / 60,
    speakingTime: speakingMinutes
  };
}
```

## 8. Implementation Plan

1. **Create meditation-generator.ts command**
2. **Build MeditationBuilder class with**:
   - RAG knowledge extractor
   - Template loader
   - Section calculator
   - Pause inserter
   - Duration validator

3. **Generate with iterative refinement**:
   - Generate initial draft
   - Validate duration
   - Adjust word count/pauses
   - Regenerate if needed

4. **Output formats**:
   - Markdown with timing annotations
   - Plain text for reading
   - JSON with metadata
   - Audio script format

## 9. Quality Metrics

- **Timing Accuracy**: Within 10% of target duration
- **Pause Distribution**: Even spacing, natural flow
- **Content Relevance**: Incorporates lecture knowledge
- **Structure Compliance**: Follows template pattern
- **Mantra Accuracy**: Correct Sanskrit/pronunciation guides
- **Accessibility**: Clear, simple language

## 10. Future Enhancements

1. **Audio Generation**: Convert to speech with ElevenLabs
2. **Music Integration**: Add background tracks/bells
3. **Personalization**: Adjust for user level/preferences  
4. **Multi-language**: Generate in different languages
5. **Guided Series**: Create progressive meditation courses