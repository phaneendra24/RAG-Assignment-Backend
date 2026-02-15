import { IngestInput, QueryInput } from './data.schema';
import * as textService from '../services/text.service';
import * as scrapeService from '../services/scrape.service';
import { createDocument, getDocuments } from '../db/queries';
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

      if (cleanedText.length <= 0) {
        return { success: false, message: 'Failed to ingest data' };
      }
      const title = cleanedText?.split('\n')[0]?.slice(0, 80).trim() ?? '';

      const id = await createDocument('NOTE', title, null, cleanedText);
      console.log('Data added to DB : ', id);

      const chunks = tokenizer.chunkText(cleanedText);

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
      }
    } else if (payload.type === 'URL' && Array.isArray(payload.content)) {
      console.log('Scrapping data started');
      const data = await scrapeService.ScrapeAndCleanDataFromUrls(
        payload.content,
      );

      console.log('Scrapping completed :', data);

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!item) continue;
        const id = await createDocument(
          'URL',
          item?.title || '',
          item.url,
          item.cleanedText,
        );
        console.log('Data added to DB : ', id);

        const chunks = tokenizer.chunkText(item.cleanedText);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i] as string;
          if (!chunk.trim()) continue;

          const embedding = await generateEmbedding(chunk);

          await addChunkToVectorStore(randomUUID(), embedding, chunk, {
            documentId: id,
            sourceType: 'URL',
            chunkIndex: i,
            title: item.title,
            url: item.url,
          });
        }
      }
    }

    return { success: true, message: 'Data ingested successfully' };
  } catch (error) {
    console.log('Ingest Error : ', error);
    return { success: false, message: 'Failed to ingest data' };
  }
};

export const getItems = async (source?: string) => {
  try {
    const data = await getDocuments(source);
    return data;
  } catch (error) {}
  return { success: true };
};

export const query = async (payload: QueryInput) => {
  const embedding = await generateEmbedding(payload.question);

  const results = await queryVectorStore(embedding, 5);

  const un_filtered_documents = results.documents[0];
  const metadatas = results.metadatas[0];
  const distances = results.distances?.[0];

  console.log('Un filtered documents : ', distances);

  const SIMILARITY_THRESHOLD = 1.2;

  const documents = un_filtered_documents
    ?.map((doc, index) => ({
      doc,
      meta: (metadatas || [])[index],
      distance: distances?.[index],
    }))
    .filter(
      (item) =>
        item.distance != null &&
        item?.distance !== undefined &&
        item.distance < SIMILARITY_THRESHOLD,
    );

  if (!documents || documents.length === 0) {
    return {
      answer: 'No relevant information found in the knowledge base.',
      citations: [],
    };
  }

  const numberedContext = documents
    .map((doc, index) => {
      if (!doc) return null;
      return `[${index + 1}] ${doc}`;
    })
    .filter(Boolean)
    .join('\n\n');

  console.log('numbered context :', numberedContext);

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
  });

  const answer = response.choices[0]?.message?.content;

  const citations = (metadatas || []).map((meta: any, index: number) => ({
    number: index + 1,
    title: meta?.title,
    url: meta?.url,
    sourceType: meta?.sourceType,
  }));

  return { answer, citations };
};
