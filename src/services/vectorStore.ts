import { ChromaClient, Collection } from 'chromadb';

const client = new ChromaClient({
  path: 'http://localhost:8000',
});

const COLLECTION_NAME = 'knowledge_base';

let collection: Collection;

export const initVectorStore = async () => {
  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
  });

  console.log(' Chroma collection ready');
};

export const addChunkToVectorStore = async (
  id: string,
  embedding: number[],
  document: string,
  metadata: any,
) => {
  await collection.add({
    ids: [id],
    embeddings: [embedding],
    documents: [document],
    metadatas: [metadata],
  });
};

export const queryVectorStore = async (embedding: number[], topK = 5) => {
  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: topK,
  });

  return results;
};
