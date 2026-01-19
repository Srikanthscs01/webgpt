/**
 * Simple token estimation utility
 * Uses a character-based approximation (roughly 4 chars per token for English text)
 */

const CHARS_PER_TOKEN = 4;

/**
 * Estimate the number of tokens in a text string
 * This is a simple approximation - for exact counts, use tiktoken
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Truncate text to a maximum token count
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

/**
 * Split text into chunks of approximately the target token size
 */
export function splitIntoChunks(
  text: string,
  targetTokens: number = 800,
  overlapTokens: number = 100
): string[] {
  const chunks: string[] = [];
  const targetChars = targetTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  
  let start = 0;
  
  while (start < text.length) {
    let end = start + targetChars;
    
    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const searchEnd = Math.min(end + 200, text.length);
      const slice = text.slice(end - 100, searchEnd);
      
      // Look for paragraph break first
      const paragraphBreak = slice.indexOf('\n\n');
      if (paragraphBreak !== -1 && paragraphBreak < 200) {
        end = end - 100 + paragraphBreak + 2;
      } else {
        // Look for sentence break
        const sentenceBreak = slice.search(/[.!?]\s/);
        if (sentenceBreak !== -1 && sentenceBreak < 200) {
          end = end - 100 + sentenceBreak + 2;
        }
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlapChars;
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Estimate cost for OpenAI API usage
 * Prices are approximate and may change
 */
export function estimateOpenAICost(
  inputTokens: number,
  outputTokens: number,
  embeddingTokens: number = 0
): number {
  const chatCostPerMillion = {
    input: 0.15,  // gpt-4o-mini input
    output: 0.60, // gpt-4o-mini output
  };
  
  const embeddingCostPerMillion = 0.02; // text-embedding-3-small
  
  const chatCost = (inputTokens / 1000000) * chatCostPerMillion.input + 
                   (outputTokens / 1000000) * chatCostPerMillion.output;
  const embeddingCost = (embeddingTokens / 1000000) * embeddingCostPerMillion;
  
  return chatCost + embeddingCost;
}

