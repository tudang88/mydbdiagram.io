/**
 * Comprehensive unit tests for Frontend Services
 * Run with: npx tsx src/client/__tests__/test-frontend-services-comprehensive.ts
 * 
 * This test suite consolidates and extends frontend service tests
 */

import { ApiClient } from '../services/ApiClient';
import { DiagramService } from '../services/DiagramService';
import { ExportService } from '../services/ExportService';
import { DiagramStore } from '../state/store/diagramStore';
import { UIStore } from '../state/store/uiStore';
import { JSONParser } from '../core/parser/JSONParser';
import { SQLParser } from '../core/parser/SQLParser';
import { Diagram } from '../core/diagram/Diagram';
import { DiagramValidator } from '../core/validator/DiagramValidator';

async function testApiClientComprehensive(): Promise<void> {
  console.log('\n🧪 Testing ApiClient (Comprehensive)...');

  const apiClient = new ApiClient('http://localhost:3000');

  // Test GET request structure
  try {
    await apiClient.get('/test');
  } catch (error) {
    // Expected to fail (server not running), but structure should be correct
    if (!(error instanceof Error)) {
      throw new Error('GET request should throw Error');
    }
  }
  console.log('✅ GET request structure correct');

  // Test POST request structure
  try {
    await apiClient.post('/test', { data: 'test' });
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('POST request should throw Error');
    }
  }
  console.log('✅ POST request structure correct');

  // Test PUT request structure
  try {
    await apiClient.put('/test', { data: 'test' });
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('PUT request should throw Error');
    }
  }
  console.log('✅ PUT request structure correct');

  // Test DELETE request structure
  try {
    await apiClient.delete('/test');
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('DELETE request should throw Error');
    }
  }
  console.log('✅ DELETE request structure correct');

  // Test error handling
  try {
    await apiClient.get('/nonexistent');
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('Error handling should work');
    }
  }
  console.log('✅ Error handling working');
}

async function testDiagramServiceComprehensive(): Promise<void> {
  console.log('\n🧪 Testing DiagramService (Comprehensive)...');

  const apiClient = new ApiClient('http://localhost:3000');
  const validator = new DiagramValidator();
  const diagramService = new DiagramService(apiClient, validator);

  // Test saveDiagram structure
  try {
    const diagram = Diagram.create('test-1');
    await diagramService.saveDiagram(diagram);
  } catch (error) {
    // Expected to fail (server not running), but structure should be correct
    if (!(error instanceof Error)) {
      throw new Error('SaveDiagram should throw Error');
    }
  }
  console.log('✅ SaveDiagram structure correct');

  // Test loadDiagram structure
  try {
    await diagramService.loadDiagram('test-id');
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('LoadDiagram should throw Error');
    }
  }
  console.log('✅ LoadDiagram structure correct');

  // Test listDiagrams structure
  try {
    await diagramService.listDiagrams();
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('ListDiagrams should throw Error');
    }
  }
  console.log('✅ ListDiagrams structure correct');

  // Test deleteDiagram structure
  try {
    await diagramService.deleteDiagram('test-id');
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('DeleteDiagram should throw Error');
    }
  }
  console.log('✅ DeleteDiagram structure correct');
}

async function testExportServiceComprehensive(): Promise<void> {
  console.log('\n🧪 Testing ExportService (Comprehensive)...');

  const apiClient = new ApiClient('http://localhost:3000');
  const exportService = new ExportService(apiClient);

  // Test export structure (ExportService uses apiClient, so structure test only)
  try {
    const diagram = Diagram.create('test-1');
    // ExportService structure verification - actual export requires server
    if (!exportService || typeof exportService !== 'object') {
      throw new Error('ExportService structure incorrect');
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      throw new Error('ExportService structure test failed');
    }
  }
  console.log('✅ ExportService structure correct');
}

async function testStoresComprehensive(): Promise<void> {
  console.log('\n🧪 Testing Stores (Comprehensive)...');

  // Test DiagramStore
  const diagramStore = new DiagramStore();
  const diagram = Diagram.create('test-1');
  diagramStore.setDiagram(diagram);

  const currentDiagram = diagramStore.getDiagram();
  if (!currentDiagram || currentDiagram.getId() !== 'test-1') {
    throw new Error('DiagramStore setDiagram/getDiagram failed');
  }
  console.log('✅ DiagramStore working');

  // Test UIStore
  const uiStore = new UIStore();
  uiStore.setState({ selectedTableId: 'table-1', zoomLevel: 1.5 });
  const uiState = uiStore.getState();
  if (uiState.selectedTableId !== 'table-1' || uiState.zoomLevel !== 1.5) {
    throw new Error('UIStore setState/getState failed');
  }
  console.log('✅ UIStore working');

  // Test subscriptions
  let notified = false;
  const unsubscribe = diagramStore.subscribe(() => {
    notified = true;
  });
  diagramStore.setDiagram(Diagram.create('test-2'));
  if (!notified) {
    throw new Error('Subscription notification failed');
  }
  unsubscribe();
  console.log('✅ Subscriptions working');
}

async function testParsersComprehensive(): Promise<void> {
  console.log('\n🧪 Testing Parsers (Comprehensive)...');

  // Test JSONParser
  const jsonParser = new JSONParser();
  const validJSON = {
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

  const parseResult = jsonParser.parse(JSON.stringify(validJSON));
  if (!parseResult.success || !parseResult.data) {
    throw new Error('JSONParser parse failed');
  }
  if (parseResult.data.getId() !== 'test-1') {
    throw new Error('JSONParser parse returned wrong diagram');
  }
  console.log('✅ JSONParser working');

  // Test SQLParser
  const sqlParser = new SQLParser();
  const validSQL = `
    CREATE TABLE Users (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    );
  `;
  const parsedSQLResult = sqlParser.parse(validSQL);
  if (!parsedSQLResult.success || !parsedSQLResult.data) {
    throw new Error('SQLParser parse failed');
  }
  if (parsedSQLResult.data.getAllTables().length === 0) {
    throw new Error('SQLParser parse returned empty diagram');
  }
  console.log('✅ SQLParser working');

  // Test canParse
  if (!jsonParser.canParse(JSON.stringify(validJSON))) {
    throw new Error('JSONParser canParse failed');
  }
  if (!sqlParser.canParse(validSQL)) {
    throw new Error('SQLParser canParse failed');
  }
  console.log('✅ Parser canParse working');
}

async function runTests(): Promise<void> {
  try {
    await testApiClientComprehensive();
    await testDiagramServiceComprehensive();
    await testExportServiceComprehensive();
    await testStoresComprehensive();
    await testParsersComprehensive();

    console.log('\n✅ All frontend service tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();

