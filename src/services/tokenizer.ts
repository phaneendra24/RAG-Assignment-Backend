import { encoding_for_model } from 'tiktoken';
import { TextDecoder } from 'util';

const encoder = encoding_for_model('gpt-5-nano');
const textDecoder = new TextDecoder();

export const encodeText = (text: string): Uint32Array => {
  return encoder.encode(text);
};


const MAX_CHUNK_TOKENS = 500;

const countTokens = (text: string): number => {
  return encoder.encode(text).length;
};

const splitIntoSentences = (text: string): string[] => {
  return text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [];
};

export const chunkText = (text: string): string[] => {
  const paragraphs = text
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokenCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);

    if (paragraphTokens > MAX_CHUNK_TOKENS) {
      const sentences = splitIntoSentences(paragraph);

      for (const sentence of sentences) {
        const sentenceTokens = countTokens(sentence);

        if (sentenceTokens > MAX_CHUNK_TOKENS) {
          const tokens = encoder.encode(sentence);

          for (let i = 0; i < tokens.length; i += MAX_CHUNK_TOKENS) {
            const slice = tokens.slice(i, i + MAX_CHUNK_TOKENS);
            const decoded = new TextDecoder().decode(encoder.decode(slice));
            chunks.push(decoded);
          }

          continue;
        }

        if (currentTokenCount + sentenceTokens > MAX_CHUNK_TOKENS) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
          currentTokenCount = sentenceTokens;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
          currentTokenCount += sentenceTokens;
        }
      }

      continue;
    }

    if (currentTokenCount + paragraphTokens > MAX_CHUNK_TOKENS) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
      currentTokenCount = paragraphTokens;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokenCount += paragraphTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};
