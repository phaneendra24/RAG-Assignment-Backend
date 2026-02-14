import { z } from 'zod';

export const IngestSchema = z.object({
  type: z.enum(['NOTE', 'URL']),
  content: z.union([
    z.array(z.string()).min(1, 'Content cannot be empty'),
    z.string().min(1, 'Content cannot be empty'),
  ]),
});

export const QuerySchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
});

export type IngestInput = z.infer<typeof IngestSchema>;
export type QueryInput = z.infer<typeof QuerySchema>;
