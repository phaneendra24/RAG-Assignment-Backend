import { IngestInput, QueryInput } from './data.schema';
import * as textService from '../services/text.service';
import * as scrapeService from '../services/scrape.service';
import {
  createDocument,
  getDocuments,
  createConversation,
  getConversations,
  getConversationById,
  addMessageToConversation,
  updateConversationTitle,
} from '../db/queries';
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
): Promise<{
  success: boolean;
  message: string;
}> => {
  console.log('Ingest Payload : ', payload);

  try {
    if (payload.type === 'NOTE') {
      const cleanedText = textService.processAndCleanTextInput(payload.content);

      if (cleanedText.length <= 0) {
        return {
          success: false,
          message: 'Failed to ingest data: content is empty after cleaning',
        };
      }

      const title = cleanedText?.split('\n')[0]?.slice(0, 80).trim() ?? '';

      const id = await createDocument('NOTE', title, null, cleanedText);
      console.log('Note added to DB : ', id);

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

      return {
        success: true,
        message: 'Note ingested successfully',
      };
    }

    if (payload.type === 'URL') {
      const url = payload.content.trim();
      console.log('Scraping URL:', url);

      const scrapedData = await scrapeService.ScrapeAndCleanDataFromUrl(url);
      console.log('Scraping completed:', scrapedData);

      if (!scrapedData.success) {
        return {
          success: false,
          message: `Failed to scrape URL: ${scrapedData.error || 'Unknown error'}`,
        };
      }

      // Validate content before saving
      if (!scrapedData.cleanedText || scrapedData.cleanedText.length < 10) {
        return {
          success: false,
          message: 'Insufficient content extracted from URL',
        };
      }

      const id = await createDocument(
        'URL',
        scrapedData.title || 'Untitled',
        scrapedData.url,
        scrapedData.cleanedText,
      );
      console.log('URL data added to DB:', id);

      const chunks = tokenizer.chunkText(scrapedData.cleanedText);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] as string;
        if (!chunk.trim()) continue;

        const embedding = await generateEmbedding(chunk);

        await addChunkToVectorStore(randomUUID(), embedding, chunk, {
          documentId: id,
          sourceType: 'URL',
          chunkIndex: i,
          title: scrapedData.title || 'Untitled',
          url: scrapedData.url,
        });
      }

      return {
        success: true,
        message: 'URL ingested successfully',
      };
    }

    return { success: false, message: 'Invalid payload type' };
  } catch (error) {
    console.error('Ingest Error : ', error);
    return {
      success: false,
      message: `Failed to ingest data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

export const getItems = async (source?: string) => {
  try {
    const data = await getDocuments(source);
    return data;
  } catch (error) {
    console.error('GetItems Error:', error);
    return [];
  }
};

export const query = async (payload: QueryInput) => {
  let conversationId = payload.conversation_id;

  if (!conversationId) {
    conversationId = await createConversation(payload.question.slice(0, 50));
  }

  await addMessageToConversation(conversationId, 'user', payload.question);

  const embedding = await generateEmbedding(payload.question);

  const results = await queryVectorStore(embedding, 5);

  const documents = results.documents[0];
  const metadatas = results.metadatas[0];

  console.log('Un filtered documents : ', documents);

  if (!documents || documents.length === 0) {
    const answer = 'No relevant information found in the knowledge base.';
    await addMessageToConversation(conversationId, 'assistant', answer, []);
    return {
      answer,
      citations: [],
      conversation_id: conversationId,
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

And do not include citations in the answer, you should response with answer. If you don't know respond with - There isn't enough information in the provided context to define or explain
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

  const answer =
    response.choices[0]?.message?.content || 'No response generated.';

  const citations = (metadatas || [])
    .map((meta: any) => ({
      title: meta?.title,
      url: meta?.url,
      sourceType: meta?.sourceType,
    }))
    .filter(
      (citation, index, self) =>
        citation.url && self.findIndex((c) => c.url === citation.url) === index,
    )
    .map((citation, index) => ({
      ...citation,
      number: index + 1,
    }));

  await addMessageToConversation(
    conversationId,
    'assistant',
    answer,
    citations,
  );

  return { answer, citations, conversation_id: conversationId };
};

export const getAllConversations = async () => {
  try {
    const conversations = await getConversations();
    return conversations.map((conv) => ({
      ...conv,
      messages: conv.messages.map((msg) => ({
        ...msg,
        citations: msg.citations ? JSON.parse(msg.citations) : [],
      })),
    }));
  } catch (error) {
    console.error('GetConversations Error:', error);
    return [];
  }
};

export const getConversation = async (id: number) => {
  try {
    const conversation = await getConversationById(id);
    if (!conversation) return null;
    return {
      ...conversation,
      messages: conversation.messages.map((msg) => ({
        ...msg,
        citations: msg.citations ? JSON.parse(msg.citations) : [],
      })),
    };
  } catch (error) {
    console.error('GetConversation Error:', error);
    return null;
  }
};
