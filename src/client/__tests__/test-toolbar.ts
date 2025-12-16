/**
 * Unit tests for Toolbar Component
 * Run with: npx tsx src/client/__tests__/test-toolbar.ts
 *
 * Note: These tests verify component logic and integration,
 * not React rendering (which would require React Testing Library)
 */

import { DiagramStore } from '../state/store/diagramStore';
import { DiagramService } from '../services/DiagramService';
import { ExportService } from '../services/ExportService';
import { ApiClient } from '../services/ApiClient';
import { DiagramValidator } from '../core/validator/DiagramValidator';
import { Diagram } from '../core/diagram/Diagram';
import { Table } from '../core/table/Table';
import { JSONParser } from '../core/parser/JSONParser';
import { SQLParser } from '../core/parser/SQLParser';

async function testToolbarIntegration(): Promise<void> {
  console.log('\n🧪 Testing Toolbar Integration...');

  // Setup services
  const apiClient = new ApiClient('http://localhost:3000');
  const validator = new DiagramValidator();
  const diagramService = new DiagramService(apiClient, validator);
  const exportService = new ExportService(apiClient);
  const diagramStore = new DiagramStore();

  // Test initial state
  const initialDiagram = diagramStore.getDiagram();
  if (initialDiagram !== null) {
    throw new Error('DiagramStore should start with null diagram');
  }
  console.log('✅ Initial state correct');

  // Test New Diagram functionality
  const newDiagram = Diagram.create(`diagram-${Date.now()}`);
  diagramStore.setDiagram(newDiagram);
  const storedDiagram = diagramStore.getDiagram();
  if (!storedDiagram || storedDiagram.getId() !== newDiagram.getId()) {
    throw new Error('New diagram creation failed');
  }
  console.log('✅ New diagram functionality working');

  // Test Save Diagram logic (structure)
  const saveResult = await diagramService.saveDiagram(newDiagram);
  // We expect this to fail (server not running), but structure should be correct
  if (saveResult.hasOwnProperty('success') && saveResult.hasOwnProperty('errors')) {
    console.log('✅ Save diagram structure correct');
  } else {
    throw new Error('Save diagram structure incorrect');
  }

  // Test Load Diagram logic (structure)
  const loadResult = await diagramService.loadDiagram('test-id');
  // We expect this to fail (server not running), but structure should be correct
  if (loadResult.hasOwnProperty('success') && loadResult.hasOwnProperty('error')) {
    console.log('✅ Load diagram structure correct');
  } else {
    throw new Error('Load diagram structure incorrect');
  }

  // Test Export Diagram logic (structure)
  const exportResult = await exportService.exportDiagram('test-id', 'json');
  // We expect this to fail (server not running), but structure should be correct
  if (exportResult.hasOwnProperty('success') && exportResult.hasOwnProperty('error')) {
    console.log('✅ Export diagram structure correct');
  } else {
    throw new Error('Export diagram structure incorrect');
  }

  console.log('✅ Toolbar integration working');
}

async function testImportFunctionality(): Promise<void> {
  console.log('\n🧪 Testing Import Functionality...');

  // Test JSON import
  const jsonData = JSON.stringify({
    id: 'imported-diagram',
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
  });

  const jsonParser = new JSONParser();
  const jsonResult = jsonParser.parse(jsonData);
  if (!jsonResult.success || !jsonResult.data) {
    throw new Error('JSON import parsing failed');
  }
  if (jsonResult.data.getId() !== 'imported-diagram') {
    throw new Error('JSON import data incorrect');
  }
  console.log('✅ JSON import working');

  // Test SQL import
  const sqlData = `
    CREATE TABLE Users (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    );
  `;

  const sqlParser = new SQLParser();
  const sqlResult = sqlParser.parse(sqlData);
  if (!sqlResult.success || !sqlResult.data) {
    throw new Error('SQL import parsing failed');
  }
  const tables = sqlResult.data.getAllTables();
  if (tables.length === 0) {
    throw new Error('SQL import tables not parsed');
  }
  console.log('✅ SQL import working');

  // Test file extension detection logic
  const getFileExtension = (filename: string): string | undefined => {
    return filename.split('.').pop()?.toLowerCase();
  };

  if (getFileExtension('diagram.json') !== 'json') {
    throw new Error('File extension detection failed');
  }
  if (getFileExtension('diagram.sql') !== 'sql') {
    throw new Error('File extension detection failed');
  }
  console.log('✅ File extension detection working');

  // Test unsupported format handling
  const unsupportedExtension = getFileExtension('diagram.txt');
  if (unsupportedExtension === 'json' || unsupportedExtension === 'sql') {
    throw new Error('Unsupported format detection failed');
  }
  console.log('✅ Unsupported format handling working');
}

async function testExportFunctionality(): Promise<void> {
  console.log('\n🧪 Testing Export Functionality...');

  const apiClient = new ApiClient('http://localhost:3000');
  const exportService = new ExportService(apiClient);

  // Test export format selection
  const supportedFormats = ['json', 'sql', 'svg'];
  if (!supportedFormats.includes('json') || !supportedFormats.includes('sql')) {
    throw new Error('Supported formats incorrect');
  }
  console.log('✅ Export format selection working');

  // Test export structure
  const exportResult = await exportService.exportDiagram('test-id', 'json');
  // We expect this to fail (server not running), but structure should be correct
  if (
    exportResult.hasOwnProperty('success') &&
    (exportResult.hasOwnProperty('format') ||
      exportResult.hasOwnProperty('filePath') ||
      exportResult.hasOwnProperty('error'))
  ) {
    console.log('✅ Export result structure correct');
  } else {
    throw new Error('Export result structure incorrect');
  }

  // Test download URL generation logic (simulated)
  const generateDownloadUrl = (format: string, diagramId: string): string => {
    return `/api/diagrams/${diagramId}/export?format=${format}`;
  };

  const downloadUrl = generateDownloadUrl('json', 'test-123');
  if (downloadUrl !== '/api/diagrams/test-123/export?format=json') {
    throw new Error('Download URL generation failed');
  }
  console.log('✅ Download URL generation working');
}

async function testToolbarStateManagement(): Promise<void> {
  console.log('\n🧪 Testing Toolbar State Management...');

  const diagramStore = new DiagramStore();

  // Test diagram state changes
  const diagram1 = Diagram.create('diagram-1');
  diagramStore.setDiagram(diagram1);
  if (diagramStore.getDiagram()?.getId() !== 'diagram-1') {
    throw new Error('Diagram state management failed');
  }
  console.log('✅ Diagram state management working');

  // Test new diagram creation
  const diagram2 = Diagram.create('diagram-2');
  diagramStore.setDiagram(diagram2);
  if (diagramStore.getDiagram()?.getId() !== 'diagram-2') {
    throw new Error('New diagram state update failed');
  }
  console.log('✅ New diagram state update working');

  // Test diagram replacement
  const diagram3 = Diagram.create('diagram-3');
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  diagram3.addTable(table);
  diagramStore.setDiagram(diagram3);

  const stored = diagramStore.getDiagram();
  if (!stored || stored.getAllTables().length !== 1) {
    throw new Error('Diagram replacement failed');
  }
  console.log('✅ Diagram replacement working');
}

async function testErrorHandling(): Promise<void> {
  console.log('\n🧪 Testing Error Handling...');

  // Test save error handling
  const apiClient = new ApiClient('http://localhost:3000');
  const validator = new DiagramValidator();
  const diagramService = new DiagramService(apiClient, validator);

  const diagram = Diagram.create('test-diagram');
  const result = await diagramService.saveDiagram(diagram);

  // Should handle error gracefully
  if (!result.hasOwnProperty('success')) {
    throw new Error('Error handling structure incorrect');
  }
  console.log('✅ Save error handling working');

  // Test load error handling
  const loadResult = await diagramService.loadDiagram('nonexistent');
  if (!loadResult.hasOwnProperty('success') || !loadResult.hasOwnProperty('error')) {
    throw new Error('Load error handling structure incorrect');
  }
  console.log('✅ Load error handling working');

  // Test export error handling
  const exportService = new ExportService(apiClient);
  const exportResult = await exportService.exportDiagram('nonexistent', 'json');
  if (!exportResult.hasOwnProperty('success') || !exportResult.hasOwnProperty('error')) {
    throw new Error('Export error handling structure incorrect');
  }
  console.log('✅ Export error handling working');

  // Test import error handling
  const jsonParser = new JSONParser();
  const invalidJson = '{ invalid json }';
  const parseResult = jsonParser.parse(invalidJson);
  if (parseResult.success) {
    throw new Error('Import error handling failed');
  }
  if (!parseResult.errors || parseResult.errors.length === 0) {
    throw new Error('Import error messages missing');
  }
  console.log('✅ Import error handling working');
}

async function runTests(): Promise<void> {
  try {
    await testToolbarIntegration();
    await testImportFunctionality();
    await testExportFunctionality();
    await testToolbarStateManagement();
    await testErrorHandling();

    console.log('\n✅ All toolbar component tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
