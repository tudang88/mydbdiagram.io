import { Router } from 'express';
import { ExportController } from '../controllers/ExportController';
import { ExportService } from '../services/ExportService';
import { DiagramService } from '../services/DiagramService';
import { DiagramRepository } from '../repositories/DiagramRepository';
import { FileRepository } from '../repositories/FileRepository';
import { ExporterFactory } from '../exporters/ExporterFactory';

const router = Router();

// Initialize dependencies
const fileRepository = new FileRepository('./data');
const diagramRepository = new DiagramRepository(fileRepository);
const diagramService = new DiagramService(diagramRepository);
const exporterFactory = new ExporterFactory(new FileRepository('./output'));
const exportService = new ExportService(diagramService, exporterFactory);
const controller = new ExportController(exportService);

// Routes
router.post('/:id/export', controller.export.bind(controller));
router.get('/formats', controller.getFormats.bind(controller));

export default router;

