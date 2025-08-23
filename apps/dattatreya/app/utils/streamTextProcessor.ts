export function createStreamTextProcessor(initialSpeak: (text: string) => void) {
  let speak = initialSpeak;
  let accumulatedText = "";
  let lastSpokenIndex = 0;

  return {
    processText: (newText: string, isComplete: boolean = false) => {
      if (newText.length <= accumulatedText.length) {
        return; // No new content
      }

      accumulatedText = newText;
      
      // Process all complete sentences in the unspoken text
      while (lastSpokenIndex < accumulatedText.length) {
        const unspokenText = accumulatedText.substring(lastSpokenIndex);
        const match = unspokenText.match(/^.*?[.!?](?:\s|$)/);
        
        if (!match) {
          break; // No complete sentence found
        }
        
        const sentence = match[0].trim();
        if (sentence) {
          console.log("Speaking sentence:", sentence);
          speak(sentence);
        }
        lastSpokenIndex += match[0].length;
      }
      
      // If streaming is complete, speak any remaining text
      if (isComplete) {
        const remaining = accumulatedText.substring(lastSpokenIndex).trim();
        if (remaining) {
          console.log("Speaking remaining text:", remaining);
          speak(remaining);
          lastSpokenIndex = accumulatedText.length;
        }
      }
    },
    
    reset: () => {
      accumulatedText = "";
      lastSpokenIndex = 0;
    },
    
    updateSpeakFunction: (newSpeak: (text: string) => void) => {
      speak = newSpeak;
    }
  };
}