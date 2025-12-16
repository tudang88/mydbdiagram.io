/**
 * Unit tests for Repository layer
 * Run with: npx tsx src/server/__tests__/test-repositories.ts
 */

import { FileRepository } from '../repositories/FileRepository';
import { DiagramRepository } from '../repositories/DiagramRepository';
import { DiagramData } from '../../client/types/diagram.types';
import { promises as fs } from 'fs';

const TEST_DATA_DIR = './test-data';
const TEST_OUTPUT_DIR = './test-output';

async function cleanup(): Promise<void> {
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

async function testFileRepository(): Promise<void> {
  console.log('\n🧪 Testing FileRepository...');

  const fileRepo = new FileRepository(TEST_DATA_DIR);

  // Test writeJSON and readJSON
  const testData = { id: 'test-1', name: 'Test' };
  await fileRepo.writeJSON('test.json', testData);
  const readData = await fileRepo.readJSON<typeof testData>('test.json');

  if (!readData || readData.id !== 'test-1') {
    throw new Error('FileRepository readJSON failed');
  }
  console.log('✅ writeJSON and readJSON working');

  // Test listFiles
  const files = await fileRepo.listFiles('');
  if (!files.includes('test.json')) {
    throw new Error('FileRepository listFiles failed');
  }
  console.log('✅ listFiles working');

  // Test deleteFile
  const deleted = await fileRepo.deleteFile('test.json');
  if (!deleted) {
    throw new Error('FileRepository deleteFile failed');
  }
  console.log('✅ deleteFile working');

  // Test fileExists
  const exists = await fileRepo.fileExists('test.json');
  if (exists) {
    throw new Error('FileRepository fileExists failed - file should not exist');
  }
  console.log('✅ fileExists working');
}

async function testDiagramRepository(): Promise<void> {
  console.log('\n🧪 Testing DiagramRepository...');

  const fileRepo = new FileRepository(TEST_DATA_DIR);
  const diagramRepo = new DiagramRepository(fileRepo, 'diagrams');

  // Test create and save
  const diagram: DiagramData = {
    id: 'diagram-test-1',
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
            constraints: [{ type: 'PRIMARY_KEY' }],
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

  const saved = await diagramRepo.save(diagram);
  if (saved.id !== diagram.id) {
    throw new Error('DiagramRepository save failed');
  }
  console.log('✅ save working');

  // Test findById
  const found = await diagramRepo.findById('diagram-test-1');
  if (!found || found.id !== 'diagram-test-1') {
    throw new Error('DiagramRepository findById failed');
  }
  console.log('✅ findById working');

  // Test findAll
  const all = await diagramRepo.findAll();
  if (all.length === 0 || !all.find(d => d.id === 'diagram-test-1')) {
    throw new Error('DiagramRepository findAll failed');
  }
  console.log('✅ findAll working');

  // Test update
  const updated = await diagramRepo.update('diagram-test-1', {
    tables: [
      {
        id: 'table-1',
        name: 'Users_Updated',
        position: { x: 200, y: 200 },
        columns: diagram.tables[0].columns,
      },
    ],
  });
  if (!updated || updated.tables[0].name !== 'Users_Updated') {
    throw new Error('DiagramRepository update failed');
  }
  console.log('✅ update working');

  // Test delete
  const deleted = await diagramRepo.delete('diagram-test-1');
  if (!deleted) {
    throw new Error('DiagramRepository delete failed');
  }
  console.log('✅ delete working');

  // Verify deletion
  const notFound = await diagramRepo.findById('diagram-test-1');
  if (notFound) {
    throw new Error('DiagramRepository delete verification failed');
  }
  console.log('✅ delete verification working');
}

async function runTests(): Promise<void> {
  try {
    await cleanup();
    await testFileRepository();
    await testDiagramRepository();
    await cleanup();

    console.log('\n✅ All repository tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await cleanup();
    process.exit(1);
  }
}

runTests();
