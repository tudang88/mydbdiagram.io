import { Router } from 'express';
import diagramRoutes from './diagram.routes';
import exportRoutes from './export.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Diagram routes
router.use('/api/diagrams', diagramRoutes);

// Export routes
router.use('/api/diagrams', exportRoutes);

export default router;

