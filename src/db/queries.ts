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
