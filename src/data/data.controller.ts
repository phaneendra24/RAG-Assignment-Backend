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
  res.status(201).json({ success: true, data: result });
};

export const getItems = async (req: Request, res: Response) => {
  const { source } = req.query;

  if (!source) {
    res.status(400).json({ error: 'Source is required' });
    return;
  }

  const items = await service.getItems(source as string);
  console.log('ALl items : ', items);

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
