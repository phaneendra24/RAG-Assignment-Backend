import { prisma } from './index';

export const createDocument = async (
  source: string,
  title: string | null,
  url: string | null,
  content: string,
) => {
  const result = await prisma.documents.create({
    data: {
      source,
      title,
      url,
      content,
    },
  });
  return result.id;
};

export const getDocuments = async (source?: string) => {
  if (source) {
    return prisma.documents.findMany({
      where: {
        source,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }
  return prisma.documents.findMany({
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const createConversation = async (title?: string) => {
  const result = await prisma.conversations.create({
    data: {
      title: title || 'New Chat',
    },
  });
  return result.id;
};

export const getConversations = async () => {
  return prisma.conversations.findMany({
    orderBy: {
      updated_at: 'desc',
    },
    include: {
      messages: {
        orderBy: {
          created_at: 'asc',
        },
      },
    },
  });
};

export const getConversationById = async (id: number) => {
  return prisma.conversations.findUnique({
    where: {
      id,
    },
    include: {
      messages: {
        orderBy: {
          created_at: 'asc',
        },
      },
    },
  });
};

export const addMessageToConversation = async (
  conversationId: number,
  role: string,
  content: string,
  citations?: any[],
) => {
  const result = await prisma.messages.create({
    data: {
      conversation_id: conversationId,
      role,
      content,
      citations: citations ? JSON.stringify(citations) : null,
    },
  });

  await prisma.conversations.update({
    where: {
      id: conversationId,
    },
    data: {
      updated_at: new Date(),
    },
  });

  return result.id;
};

export const updateConversationTitle = async (id: number, title: string) => {
  await prisma.conversations.update({
    where: {
      id,
    },
    data: {
      title,
    },
  });
};
