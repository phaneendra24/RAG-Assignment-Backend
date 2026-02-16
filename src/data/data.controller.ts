import { Request, Response } from 'express';
import * as service from './data.service';
import { IngestSchema, QuerySchema } from './data.schema';

export const ingest = async (req: Request, res: Response) => {
  const validation = IngestSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ success: false, error: validation.error.issues });
    return;
  }

  const result = await service.ingest(validation.data);
  
  if (!result.success) {
    res.status(422).json({ success: false, message: result.message });
    return;
  }
  
  res.status(201).json({ success: true, message: result.message });
};

export const getItems = async (req: Request, res: Response) => {
  const { source } = req.query;

  if (!source) {
    res.status(400).json({ error: 'Source is required' });
    return;
  }

  const items = await service.getItems(source as string);

  res.status(200).json({ success: true, data: items });
};

export const query = async (req: Request, res: Response) => {
  const validation = QuerySchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.issues });
    return;
  }

  const results = await service.query(validation.data);
  res.status(200).json({ success: true, data: results });
};

export const getConversations = async (req: Request, res: Response) => {
  const conversations = await service.getAllConversations();
  res.status(200).json({ success: true, data: conversations });
};

export const getConversation = async (req: Request, res: Response) => {
  const { id } = req.params as any;
  const conversation = await service.getConversation(parseInt(id));
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.status(200).json({ success: true, data: conversation });
};
