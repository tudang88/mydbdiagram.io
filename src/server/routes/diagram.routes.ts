import { Router } from 'express';
import { DiagramController } from '../controllers/DiagramController';
import { DiagramService } from '../services/DiagramService';
import { ValidationService } from '../services/ValidationService';
import { DiagramRepository } from '../repositories/DiagramRepository';
import { FileRepository } from '../repositories/FileRepository';

const router = Router();

// Initialize dependencies
const fileRepository = new FileRepository('./data');
const diagramRepository = new DiagramRepository(fileRepository);
const validationService = new ValidationService();
const diagramService = new DiagramService(diagramRepository);
const controller = new DiagramController(diagramService, validationService);

// Routes
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.get('/', controller.list.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;

