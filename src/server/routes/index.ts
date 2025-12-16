import { Router } from 'express';
import diagramRoutes from './diagram.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Diagram routes
router.use('/api/diagrams', diagramRoutes);

// TODO: Add export routes
// router.use('/api/diagrams/:id/export', exportRoutes);

export default router;

