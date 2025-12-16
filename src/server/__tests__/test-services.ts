/**
 * Unit tests for Service layer
 * Run with: npx tsx src/server/__tests__/test-services.ts
 */

import { DiagramService } from '../services/DiagramService';
import { ValidationService } from '../services/ValidationService';
import { DiagramRepository } from '../repositories/DiagramRepository';
import { FileRepository } from '../repositories/FileRepository';
import { ConstraintType } from '../../client/types/common.types';

const TEST_DATA_DIR = './test-data';

async function cleanup(): Promise<void> {
  try {
    const { promises: fs } = await import('fs');
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

async function testValidationService(): Promise<void> {
  console.log('\n🧪 Testing ValidationService...');

  const validator = new ValidationService();

  // Test valid diagram
  const validDiagram = {
    id: 'test-1',
    tables: [
      {
        id: 'table-1',
        name: 'Users',
        position: { x: 100, y: 100 },
        columns: [
          {
            id: 'col-1',
            name: 'id',
            type: 'INTEGER',
            constraints: [],
          },
        ],
      },
    ],
    relationships: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const validResult = validator.validateDiagram(validDiagram);
  if (!validResult.isValid) {
    throw new Error('ValidationService should accept valid diagram');
  }
  console.log('✅ Valid diagram validation working');

  // Test invalid diagram (missing id)
  const invalidDiagram = {
    tables: [],
    relationships: [],
    metadata: {},
  };

  const invalidResult = validator.validateDiagram(invalidDiagram);
  if (invalidResult.isValid) {
    throw new Error('ValidationService should reject invalid diagram');
  }
  console.log('✅ Invalid diagram validation working');
}

async function testDiagramService(): Promise<void> {
  console.log('\n🧪 Testing DiagramService...');

  const fileRepo = new FileRepository(TEST_DATA_DIR);
  const diagramRepo = new DiagramRepository(fileRepo);
  const service = new DiagramService(diagramRepo);

  // Test create
  const diagramData = {
    tables: [
      {
        id: 'table-1',
        name: 'Users',
        position: { x: 100, y: 100 },
        columns: [
          {
            id: 'col-1',
            name: 'id',
            type: 'INTEGER',
            constraints: [{ type: 'PRIMARY_KEY' as ConstraintType }],
          },
        ],
      },
    ],
    relationships: [],
  };

  const created = await service.create(diagramData);
  if (!created.id || !created.metadata.createdAt) {
    throw new Error('DiagramService create failed');
  }
  console.log('✅ create working');

  const diagramId = created.id;

  // Test findById
  const found = await service.findById(diagramId);
  if (!found || found.id !== diagramId) {
    throw new Error('DiagramService findById failed');
  }
  console.log('✅ findById working');

  // Test findAll
  const all = await service.findAll();
  if (all.length === 0) {
    throw new Error('DiagramService findAll failed');
  }
  console.log('✅ findAll working');

  // Test update
  const updated = await service.update(diagramId, {
    tables: [
      {
        id: 'table-1',
        name: 'Users_Updated',
        position: { x: 200, y: 200 },
        columns: diagramData.tables[0].columns,
      },
    ],
  });
  if (!updated || updated.tables[0].name !== 'Users_Updated') {
    throw new Error('DiagramService update failed');
  }
  console.log('✅ update working');

  // Test delete
  const deleted = await service.delete(diagramId);
  if (!deleted) {
    throw new Error('DiagramService delete failed');
  }
  console.log('✅ delete working');

  // Verify deletion
  const notFound = await service.findById(diagramId);
  if (notFound) {
    throw new Error('DiagramService delete verification failed');
  }
  console.log('✅ delete verification working');
}

async function runTests(): Promise<void> {
  try {
    await cleanup();
    await testValidationService();
    await testDiagramService();
    await cleanup();

    console.log('\n✅ All service tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await cleanup();
    process.exit(1);
  }
}

runTests();
