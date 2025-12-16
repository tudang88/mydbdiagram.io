/**
 * Unit tests for Exporters
 * Run with: npx tsx src/server/__tests__/test-exporters.ts
 */

import { JSONExporter } from '../exporters/JSONExporter';
import { SQLExporter } from '../exporters/SQLExporter';
import { SVGExporter } from '../exporters/SVGExporter';
import { ExporterFactory } from '../exporters/ExporterFactory';
import { FileRepository } from '../repositories/FileRepository';
import { DiagramData } from '../../client/types/diagram.types';
import { promises as fs } from 'fs';

const TEST_OUTPUT_DIR = './test-output';

async function cleanup(): Promise<void> {
  try {
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

function createTestDiagram(): DiagramData {
  return {
    id: 'test-diagram',
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
          {
            id: 'col-2',
            name: 'name',
            type: 'VARCHAR(255)',
            constraints: [{ type: 'NOT_NULL' }],
          },
        ],
      },
      {
        id: 'table-2',
        name: 'Posts',
        position: { x: 400, y: 100 },
        columns: [
          {
            id: 'col-3',
            name: 'id',
            type: 'INTEGER',
            constraints: [{ type: 'PRIMARY_KEY' }],
          },
          {
            id: 'col-4',
            name: 'user_id',
            type: 'INTEGER',
            constraints: [{ type: 'FOREIGN_KEY', value: 'Users.id' }],
          },
        ],
      },
    ],
    relationships: [
      {
        id: 'rel-1',
        fromTableId: 'table-2',
        fromColumnId: 'col-4',
        toTableId: 'table-1',
        toColumnId: 'col-1',
        type: 'ONE_TO_MANY',
        optional: false,
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

async function testJSONExporter(): Promise<void> {
  console.log('\n🧪 Testing JSONExporter...');

  const fileRepo = new FileRepository(TEST_OUTPUT_DIR);
  const exporter = new JSONExporter(fileRepo);
  const diagram = createTestDiagram();

  const result = await exporter.export(diagram, { outputDirectory: TEST_OUTPUT_DIR });

  if (!result.success || !result.filePath) {
    throw new Error('JSONExporter export failed');
  }

  // Verify file exists
  const fileContent = await fs.readFile(result.filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  if (parsed.id !== diagram.id) {
    throw new Error('JSONExporter file content incorrect');
  }

  console.log('✅ JSONExporter working');
}

async function testSQLExporter(): Promise<void> {
  console.log('\n🧪 Testing SQLExporter...');

  const exporter = new SQLExporter();
  const diagram = createTestDiagram();

  const result = await exporter.export(diagram, { outputDirectory: TEST_OUTPUT_DIR });

  if (!result.success || !result.filePath || !result.data) {
    throw new Error('SQLExporter export failed');
  }

  const sql = result.data as string;
  if (!sql.includes('CREATE TABLE') || !sql.includes('Users') || !sql.includes('Posts')) {
    throw new Error('SQLExporter SQL content incorrect');
  }

  if (!sql.includes('FOREIGN KEY') || !sql.includes('REFERENCES')) {
    throw new Error('SQLExporter relationships not included');
  }

  console.log('✅ SQLExporter working');
}

async function testSVGExporter(): Promise<void> {
  console.log('\n🧪 Testing SVGExporter...');

  const exporter = new SVGExporter();
  const diagram = createTestDiagram();

  const result = await exporter.export(diagram, { outputDirectory: TEST_OUTPUT_DIR });

  if (!result.success || !result.filePath || !result.data) {
    throw new Error('SVGExporter export failed');
  }

  const svg = result.data as string;
  if (!svg.includes('<svg') || !svg.includes('Users') || !svg.includes('Posts')) {
    throw new Error('SVGExporter SVG content incorrect');
  }

  if (!svg.includes('<line') || !svg.includes('arrowhead')) {
    throw new Error('SVGExporter relationships not rendered');
  }

  console.log('✅ SVGExporter working');
}

async function testExporterFactory(): Promise<void> {
  console.log('\n🧪 Testing ExporterFactory...');

  const fileRepo = new FileRepository(TEST_OUTPUT_DIR);
  const factory = new ExporterFactory(fileRepo);

  // Test getSupportedFormats
  const formats = factory.getSupportedFormats();
  if (!formats.includes('json') || !formats.includes('sql') || !formats.includes('svg')) {
    throw new Error('ExporterFactory getSupportedFormats failed');
  }
  console.log('✅ getSupportedFormats working');

  // Test getExporter
  const jsonExporter = factory.getExporter('json');
  if (!jsonExporter || jsonExporter.getFormat() !== 'json') {
    throw new Error('ExporterFactory getExporter (json) failed');
  }

  const sqlExporter = factory.getExporter('sql');
  if (!sqlExporter || sqlExporter.getFormat() !== 'sql') {
    throw new Error('ExporterFactory getExporter (sql) failed');
  }

  const svgExporter = factory.getExporter('svg');
  if (!svgExporter || svgExporter.getFormat() !== 'svg') {
    throw new Error('ExporterFactory getExporter (svg) failed');
  }

  // Test unsupported format
  const unsupported = factory.getExporter('xyz');
  if (unsupported !== null) {
    throw new Error('ExporterFactory should return null for unsupported format');
  }

  console.log('✅ getExporter working');
  console.log('✅ isFormatSupported working');
}

async function runTests(): Promise<void> {
  try {
    await cleanup();
    await testJSONExporter();
    await testSQLExporter();
    await testSVGExporter();
    await testExporterFactory();
    await cleanup();

    console.log('\n✅ All exporter tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await cleanup();
    process.exit(1);
  }
}

runTests();

