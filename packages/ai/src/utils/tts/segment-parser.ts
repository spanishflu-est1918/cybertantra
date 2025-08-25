interface TextSegment {
  type: 'speech';
  text: string;
  index: number;
}

interface PauseSegment {
  type: 'pause';
  duration: number;
  index: number;
}

export type Segment = TextSegment | PauseSegment;

/**
 * Parse text with break tags into segments
 */
export function parseTextIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let index = 0;
  
  // Split by break tags while keeping the break info
  const regex = /<break\s+time="(\d+(?:\.\d+)?)s?"\s*\/>/g;
  let lastEnd = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text segment before the break
    const textBefore = text.substring(lastEnd, match.index).trim();
    if (textBefore) {
      segments.push({
        type: 'speech',
        text: textBefore,
        index: index++
      });
    }
    
    // Add pause segment
    segments.push({
      type: 'pause',
      duration: parseFloat(match[1]),
      index: index++
    });
    
    lastEnd = match.index + match[0].length;
  }
  
  // Add any remaining text
  const remainingText = text.substring(lastEnd).trim();
  if (remainingText) {
    segments.push({
      type: 'speech',
      text: remainingText,
      index: index++
    });
  }
  
  return segments;
}