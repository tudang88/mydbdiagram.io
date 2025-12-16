import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Add diagram routes
// router.use('/api/diagrams', diagramRoutes);

// TODO: Add export routes
// router.use('/api/diagrams/:id/export', exportRoutes);

export default router;

