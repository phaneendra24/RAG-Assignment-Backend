import { z } from 'zod';

export const IngestSchema = z.object({
  type: z.enum(['NOTE', 'URL']),
  content: z.string().min(1, 'Content cannot be empty'),
});

export const QuerySchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  conversation_id: z.number().optional(),
});

export const CreateConversationSchema = z.object({
  title: z.string().optional(),
});

export type IngestInput = z.infer<typeof IngestSchema>;
export type QueryInput = z.infer<typeof QuerySchema>;
