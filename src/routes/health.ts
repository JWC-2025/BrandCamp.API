import { Router } from 'express';
import { getHealth, getStatus } from '../controllers/healthController';

const router = Router();

router.get('/', getHealth);
router.get('/status', getStatus);

export default router;