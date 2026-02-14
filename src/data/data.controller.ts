import { Request, Response } from 'express';
import * as service from './data.service';
import { IngestSchema, QuerySchema } from './data.schema';

export const ingest = async (req: Request, res: Response) => {
  const validation = IngestSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.issues });
    return;
  }

  const result = await service.ingest(validation.data);
  res.status(201).json(result);
};

export const getItems = async (_req: Request, res: Response) => {
  const items = await service.getItems();
  res.json(items);
};

export const query = async (req: Request, res: Response) => {
  const validation = QuerySchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({ error: validation.error.issues });
    return;
  }

  const results = await service.query(validation.data);
  res.json(results);
};
