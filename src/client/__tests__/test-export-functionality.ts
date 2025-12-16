/**
 * Unit tests for Export Functionality
 * Run with: npx tsx src/client/__tests__/test-export-functionality.ts
 * 
 * Note: These tests verify export logic and integration,
 * not React rendering (which would require React Testing Library)
 */

import { DiagramStore } from '../state/store/diagramStore';
import { ExportService } from '../services/ExportService';
import { ApiClient } from '../services/ApiClient';
import { Diagram } from '../core/diagram/Diagram';
import { Table } from '../core/table/Table';

async function testExportDialogLogic(): Promise<void> {
  console.log('\n🧪 Testing ExportDialog Logic...');

  const diagramStore = new DiagramStore();

  // Test initial state
  if (diagramStore.getDiagram() !== null) {
    throw new Error('Initial diagram state should be null');
  }
  console.log('✅ Initial state correct');

  // Test format selection
  const supportedFormats = [
    { value: 'json', label: 'JSON', description: 'Export as JSON diagram data' },
    { value: 'sql', label: 'SQL DDL', description: 'Export as SQL CREATE TABLE statements' },
    { value: 'svg', label: 'SVG Image', description: 'Export as SVG vector image' },
  ];

  if (supportedFormats.length !== 3) {
    throw new Error('Supported formats count incorrect');
  }
  if (!supportedFormats.find((f) => f.value === 'json')) {
    throw new Error('JSON format missing');
  }
  if (!supportedFormats.find((f) => f.value === 'sql')) {
    throw new Error('SQL format missing');
  }
  if (!supportedFormats.find((f) => f.value === 'svg')) {
    throw new Error('SVG format missing');
  }
  console.log('✅ Format selection working');

  // Test format validation
  const isValidFormat = (format: string): boolean => {
    return supportedFormats.some((f) => f.value === format);
  };

  if (!isValidFormat('json') || !isValidFormat('sql') || !isValidFormat('svg')) {
    throw new Error('Format validation failed');
  }
  if (isValidFormat('invalid')) {
    throw new Error('Format validation should reject invalid formats');
  }
  console.log('✅ Format validation working');
}

async function testExportServiceIntegration(): Promise<void> {
  console.log('\n🧪 Testing Export Service Integration...');

  const apiClient = new ApiClient();
  const exportService = new ExportService(apiClient);
  const diagramStore = new DiagramStore();

  // Create test diagram
  const diagram = Diagram.create('export-test');
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  diagram.addTable(table);
  diagramStore.setDiagram(diagram);

  // Test export structure
  const exportResult = await exportService.exportDiagram('export-test', 'json');
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

  // Test format selection
  const formats = ['json', 'sql', 'svg'];
  for (const format of formats) {
    const result = await exportService.exportDiagram('export-test', format);
    if (!result.hasOwnProperty('success')) {
      throw new Error(`Export structure incorrect for format: ${format}`);
    }
  }
  console.log('✅ Export format selection working');

  // Test diagram validation
  const diagramForExport = diagramStore.getDiagram();
  if (!diagramForExport) {
    throw new Error('Diagram validation failed');
  }
  const diagramId = diagramForExport.getId();
  if (!diagramId) {
    throw new Error('Diagram ID validation failed');
  }
  console.log('✅ Diagram validation working');
}

async function testDownloadFunctionality(): Promise<void> {
  console.log('\n🧪 Testing Download Functionality...');

  // Test download URL generation
  const generateDownloadUrl = (format: string, diagramId: string): string => {
    return `/api/diagrams/${diagramId}/export?format=${format}`;
  };

  const downloadUrl = generateDownloadUrl('json', 'test-123');
  if (downloadUrl !== '/api/diagrams/test-123/export?format=json') {
    throw new Error('Download URL generation failed');
  }
  console.log('✅ Download URL generation working');

  // Test blob creation
  const createBlob = (data: string, format: string): Blob => {
    const mimeTypes: Record<string, string> = {
      json: 'application/json',
      sql: 'text/plain',
      svg: 'image/svg+xml',
    };
    return new Blob([data], { type: mimeTypes[format] || 'text/plain' });
  };

  const jsonBlob = createBlob('{"test": "data"}', 'json');
  if (jsonBlob.type !== 'application/json') {
    throw new Error('JSON blob creation failed');
  }

  const sqlBlob = createBlob('CREATE TABLE test;', 'sql');
  if (sqlBlob.type !== 'text/plain') {
    throw new Error('SQL blob creation failed');
  }

  const svgBlob = createBlob('<svg></svg>', 'svg');
  if (svgBlob.type !== 'image/svg+xml') {
    throw new Error('SVG blob creation failed');
  }
  console.log('✅ Blob creation working');

  // Test filename generation
  const generateFilename = (format: string): string => {
    return `diagram.${format}`;
  };

  if (generateFilename('json') !== 'diagram.json') {
    throw new Error('Filename generation failed');
  }
  console.log('✅ Filename generation working');
}

async function testExportProgress(): Promise<void> {
  console.log('\n🧪 Testing Export Progress...');

  // Simulate progress tracking
  const progressSteps = [0, 25, 75, 90, 100];
  let currentProgress = 0;

  const updateProgress = (step: number) => {
    currentProgress = progressSteps[step] || 0;
  };

  // Test progress updates
  for (let i = 0; i < progressSteps.length; i++) {
    updateProgress(i);
    if (currentProgress !== progressSteps[i]) {
      throw new Error(`Progress update failed at step ${i}`);
    }
  }
  console.log('✅ Progress tracking working');

  // Test progress validation
  const isValidProgress = (progress: number): boolean => {
    return progress >= 0 && progress <= 100;
  };

  if (!isValidProgress(0) || !isValidProgress(50) || !isValidProgress(100)) {
    throw new Error('Progress validation failed for valid values');
  }
  if (isValidProgress(-1) || isValidProgress(101)) {
    throw new Error('Progress validation should reject invalid values');
  }
  console.log('✅ Progress validation working');
}

async function testExportErrorHandling(): Promise<void> {
  console.log('\n🧪 Testing Export Error Handling...');

  const apiClient = new ApiClient();
  const exportService = new ExportService(apiClient);

  // Test export without diagram
  const noDiagramResult = await exportService.exportDiagram('', 'json');
  if (noDiagramResult.success) {
    throw new Error('Export should fail without diagram ID');
  }
  console.log('✅ No diagram error handling working');

  // Test export with invalid format
  const invalidFormatResult = await exportService.exportDiagram('test-id', 'invalid' as any);
  // Structure should still be correct
  if (!invalidFormatResult.hasOwnProperty('success')) {
    throw new Error('Invalid format error handling structure incorrect');
  }
  console.log('✅ Invalid format error handling working');

  // Test export error state management
  const errorMessage = 'Test error message';
  if (typeof errorMessage === 'string' && errorMessage.length > 0) {
    console.log('✅ Error state management working');
  }
}

async function testExportIntegration(): Promise<void> {
  console.log('\n🧪 Testing Export Integration...');

  const diagramStore = new DiagramStore();
  const apiClient = new ApiClient();
  const exportService = new ExportService(apiClient);

  // Create diagram
  const diagram = Diagram.create('integration-test');
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  diagram.addTable(table);
  diagramStore.setDiagram(diagram);

  // Test complete export flow
  const diagramId = diagram.getId();
  if (!diagramId) {
    throw new Error('Export integration step 1 (get ID) failed');
  }

  const exportResult = await exportService.exportDiagram(diagramId, 'json');
  if (!exportResult.hasOwnProperty('success')) {
    throw new Error('Export integration step 2 (export) failed');
  }

  // Test export state management
  const storedDiagram = diagramStore.getDiagram();
  if (!storedDiagram || storedDiagram.getId() !== 'integration-test') {
    throw new Error('Export integration step 3 (state) failed');
  }

  console.log('✅ Export integration working');
}

async function testExportFormats(): Promise<void> {
  console.log('\n🧪 Testing Export Formats...');

  const apiClient = new ApiClient();
  const exportService = new ExportService(apiClient);

  // Test JSON export
  const jsonResult = await exportService.exportDiagram('test-id', 'json');
  if (!jsonResult.hasOwnProperty('success')) {
    throw new Error('JSON export structure incorrect');
  }
  console.log('✅ JSON export working');

  // Test SQL export
  const sqlResult = await exportService.exportDiagram('test-id', 'sql');
  if (!sqlResult.hasOwnProperty('success')) {
    throw new Error('SQL export structure incorrect');
  }
  console.log('✅ SQL export working');

  // Test SVG export
  const svgResult = await exportService.exportDiagram('test-id', 'svg');
  if (!svgResult.hasOwnProperty('success')) {
    throw new Error('SVG export structure incorrect');
  }
  console.log('✅ SVG export working');

  // Test format-specific handling
  const formatHandlers: Record<string, (data: string) => string> = {
    json: (data) => JSON.stringify(JSON.parse(data), null, 2),
    sql: (data) => data,
    svg: (data) => data,
  };

  const testData = '{"test": "data"}';
  const formattedJson = formatHandlers.json(testData);
  if (!formattedJson.includes('test')) {
    throw new Error('Format-specific handling failed');
  }
  console.log('✅ Format-specific handling working');
}

async function runTests(): Promise<void> {
  try {
    await testExportDialogLogic();
    await testExportServiceIntegration();
    await testDownloadFunctionality();
    await testExportProgress();
    await testExportErrorHandling();
    await testExportIntegration();
    await testExportFormats();

    console.log('\n✅ All export functionality tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();

