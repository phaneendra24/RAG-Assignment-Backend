import { Router } from 'express';

import dataRouter from '../data/data.routes';

const router = Router();

router.use('/data', dataRouter);

export default router;
