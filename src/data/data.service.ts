import { IngestInput, QueryInput } from './data.schema';
import * as textService from '../services/text.service';
import * as scrapeService from '../services/scrape.service';
import { createDocument } from '../db/queries';
import * as tokenizer from '../services/tokenizer';
import { generateEmbedding } from '../services/embedding';
import {
  addChunkToVectorStore,
  queryVectorStore,
} from '../services/vectorStore';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const ingest = async (
  payload: IngestInput,
): Promise<{ success: boolean; message: string }> => {
  console.log('Ingest Payload : ', payload);
  try {
    if (payload.type === 'NOTE' && typeof payload.content === 'string') {
      const cleanedText = textService.processAndCleanTextInput(payload.content);
      console.log('Cleaned Text', cleanedText);

      if (cleanedText.length <= 0) {
        return { success: false, message: 'Failed to ingest data' };
      }
      const title = cleanedText?.split('\n')[0]?.slice(0, 80).trim() ?? '';

      const id = await createDocument('NOTE', title, null, cleanedText);
      console.log('Data added to DB : ', id);

      const chunks = tokenizer.chunkText(cleanedText);

      console.log('chunks :', chunks);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] as string;
        if (!chunk.trim()) continue;

        const embedding = await generateEmbedding(chunk);

        await addChunkToVectorStore(randomUUID(), embedding, chunk, {
          documentId: id,
          sourceType: 'NOTE',
          chunkIndex: i,
          title,
          url: null,
        });

        break;
      }
    } else if (payload.type === 'URL' && Array.isArray(payload.content)) {
      console.log('Scrapping data started');
      const data = await scrapeService.ScrapeAndCleanDataFromUrls(
        payload.content,
      );
      // later
    }

    return { success: true, message: 'Data ingested successfully' };
  } catch (error) {
    console.log('Ingest Error : ', error);
    return { success: false, message: 'Failed to ingest data' };
  }
};

export const getItems = async () => {
  return { success: true };
};

export const query = async (payload: QueryInput) => {
  const embedding = await generateEmbedding(payload.question);

  const results = await queryVectorStore(embedding, 5);

  const documents = results.documents[0];
  const metadatas = results.metadatas[0];

  if (!documents || documents.length === 0) {
    return {
      answer: 'No relevant information found.',
      citations: [],
    };
  }

  const numberedContext = documents
    .map((doc: string, index: number) => {
      return `[${index + 1}] ${doc}`;
    })
    .join('\n\n');

  const prompt = `
You are a helpful assistant.

Use ONLY the provided context to answer.
When referencing information, cite using [number].

Context:
${numberedContext}

Question:
${payload.question}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-5-nano',
    messages: [
      {
        role: 'system',
        content: 'You answer questions using provided context only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
  });

  const answer = await response?.choices?[0]?.message?.content;

  const citations = await metadatas.map((meta: any, index: number) => ({
    number: index + 1,
    title: meta.title,
    url: meta.url,
    sourceType: meta.sourceType,
  }));

  return { answer, citations };
};
