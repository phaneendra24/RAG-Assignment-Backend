import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateEmbedding = async (text: string): Promise<number[]> => {
  console.log('Started embedding generation', text);

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response?.data?.[0]?.embedding || [];
};
