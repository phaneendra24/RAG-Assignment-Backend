import { Router } from 'express';
import * as controller from './data.controller';

const router = Router();

router.post('/ingest', controller.ingest);
router.get('/items', controller.getItems);
router.post('/query', controller.query);

export default router;
