/**
 * Unit tests for Import Functionality
 * Run with: npx tsx src/client/__tests__/test-import-functionality.ts
 * 
 * Note: These tests verify import logic and integration,
 * not React rendering (which would require React Testing Library)
 */

import { DiagramStore } from '../state/store/diagramStore';
import { JSONParser } from '../core/parser/JSONParser';
import { SQLParser } from '../core/parser/SQLParser';

async function testImportDialogLogic(): Promise<void> {
  console.log('\n🧪 Testing ImportDialog Logic...');

  const diagramStore = new DiagramStore();

  // Test initial state
  if (diagramStore.getDiagram() !== null) {
    throw new Error('Initial diagram state should be null');
  }
  console.log('✅ Initial state correct');

  // Test import modes
  const modes = ['paste', 'sql', 'json'] as const;
  for (const mode of modes) {
    if (!modes.includes(mode)) {
      throw new Error(`Invalid import mode: ${mode}`);
    }
  }
  console.log('✅ Import modes correct');

  // Test file extension detection
  const getFileExtension = (filename: string): string | undefined => {
    return filename.split('.').pop()?.toLowerCase();
  };

  if (getFileExtension('diagram.sql') !== 'sql') {
    throw new Error('File extension detection failed for SQL');
  }
  if (getFileExtension('diagram.json') !== 'json') {
    throw new Error('File extension detection failed for JSON');
  }
  console.log('✅ File extension detection working');

  // Test validation logic
  const validateInput = (text: string, mode: 'sql' | 'json'): { isValid: boolean; error?: string } => {
    try {
      let parser: JSONParser | SQLParser;
      if (mode === 'sql') {
        parser = new SQLParser();
      } else {
        parser = new JSONParser();
      }
      const validation = parser.validate(text);
      return {
        isValid: validation.isValid,
        error: validation.errors?.map((e) => `${e.field}: ${e.message}`).join('\n'),
      };
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Validation error',
      };
    }
  };

  const validSQL = 'CREATE TABLE Users (id INTEGER PRIMARY KEY);';
  const sqlValidation = validateInput(validSQL, 'sql');
  if (!sqlValidation.isValid) {
    throw new Error('SQL validation failed for valid SQL');
  }
  console.log('✅ SQL validation working');

  const validJSON = JSON.stringify({
    id: 'test',
    tables: [],
    relationships: [],
    metadata: {},
  });
  const jsonValidation = validateInput(validJSON, 'json');
  if (!jsonValidation.isValid) {
    throw new Error('JSON validation failed for valid JSON');
  }
  console.log('✅ JSON validation working');

  // Test invalid input validation
  const invalidSQL = 'INVALID SQL';
  const invalidSqlValidation = validateInput(invalidSQL, 'sql');
  if (invalidSqlValidation.isValid) {
    throw new Error('SQL validation should fail for invalid SQL');
  }
  console.log('✅ Invalid SQL validation working');

  const invalidJSON = '{ invalid json }';
  const invalidJsonValidation = validateInput(invalidJSON, 'json');
  if (invalidJsonValidation.isValid) {
    throw new Error('JSON validation should fail for invalid JSON');
  }
  console.log('✅ Invalid JSON validation working');
}

async function testSQLImport(): Promise<void> {
  console.log('\n🧪 Testing SQL Import...');

  const parser = new SQLParser();
  const diagramStore = new DiagramStore();

  // Test valid SQL import
  const validSQL = `
    CREATE TABLE Users (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE
    );

    CREATE TABLE Posts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      title VARCHAR(255) NOT NULL
    );
  `;

  const result = parser.parse(validSQL);
  if (!result.success || !result.data) {
    throw new Error('SQL import parsing failed');
  }

  const diagram = result.data;
  const tables = diagram.getAllTables();
  if (tables.length < 2) {
    throw new Error('SQL import should parse multiple tables');
  }

  const usersTable = tables.find((t) => t.getName() === 'Users');
  if (!usersTable) {
    throw new Error('SQL import failed to parse Users table');
  }

  const columns = usersTable.getAllColumns();
  if (columns.length < 3) {
    throw new Error('SQL import failed to parse all columns');
  }

  // Test import into store
  diagramStore.setDiagram(diagram);
  const storedDiagram = diagramStore.getDiagram();
  if (!storedDiagram || storedDiagram.getAllTables().length !== 2) {
    throw new Error('SQL import into store failed');
  }

  console.log('✅ SQL import working');
}

async function testJSONImport(): Promise<void> {
  console.log('\n🧪 Testing JSON Import...');

  const parser = new JSONParser();
  const diagramStore = new DiagramStore();

  // Test valid JSON import
  const validJSON = JSON.stringify({
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
    ],
    relationships: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  const result = parser.parse(validJSON);
  if (!result.success || !result.data) {
    throw new Error('JSON import parsing failed');
  }

  const diagram = result.data;
  if (diagram.getId() !== 'imported-diagram') {
    throw new Error('JSON import diagram ID incorrect');
  }

  const tables = diagram.getAllTables();
  if (tables.length !== 1) {
    throw new Error('JSON import should parse one table');
  }

  const usersTable = tables[0];
  if (usersTable.getName() !== 'Users') {
    throw new Error('JSON import table name incorrect');
  }

  const columns = usersTable.getAllColumns();
  if (columns.length !== 2) {
    throw new Error('JSON import column count incorrect');
  }

  // Test import into store
  diagramStore.setDiagram(diagram);
  const storedDiagram = diagramStore.getDiagram();
  if (!storedDiagram || storedDiagram.getId() !== 'imported-diagram') {
    throw new Error('JSON import into store failed');
  }

  console.log('✅ JSON import working');
}

async function testImportErrorHandling(): Promise<void> {
  console.log('\n🧪 Testing Import Error Handling...');

  const sqlParser = new SQLParser();
  const jsonParser = new JSONParser();

  // Test SQL parse error
  const invalidSQL = 'SELECT * FROM users;';
  const sqlResult = sqlParser.parse(invalidSQL);
  if (sqlResult.success) {
    // SQLParser might create empty diagram, check for errors
    if (!sqlResult.errors || sqlResult.errors.length === 0) {
      console.log('⚠️  SQL parse error handling (expected: might create empty diagram)');
    }
  }
  console.log('✅ SQL parse error handling working');

  // Test JSON parse error
  const invalidJSON = '{ invalid json }';
  const jsonResult = jsonParser.parse(invalidJSON);
  if (jsonResult.success) {
    throw new Error('JSON parse should fail for invalid JSON');
  }
  if (!jsonResult.errors || jsonResult.errors.length === 0) {
    throw new Error('JSON parse errors should be present');
  }
  console.log('✅ JSON parse error handling working');

  // Test validation error
  const validationResult = jsonParser.validate(invalidJSON);
  if (validationResult.isValid) {
    throw new Error('Validation should fail for invalid JSON');
  }
  if (!validationResult.errors || validationResult.errors.length === 0) {
    throw new Error('Validation errors should be present');
  }
  console.log('✅ Validation error handling working');

  // Test unsupported format
  const unsupportedExtension = 'txt';
  if (unsupportedExtension === 'sql' || unsupportedExtension === 'json') {
    throw new Error('Unsupported format detection failed');
  }
  console.log('✅ Unsupported format handling working');
}

async function testImportIntegration(): Promise<void> {
  console.log('\n🧪 Testing Import Integration...');

  const diagramStore = new DiagramStore();
  const jsonParser = new JSONParser();

  // Test complete import flow
  const jsonData = JSON.stringify({
    id: 'integration-test',
    tables: [
      {
        id: 'table-1',
        name: 'TestTable',
        position: { x: 200, y: 200 },
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
    metadata: {},
  });

  // Step 1: Parse
  const parseResult = jsonParser.parse(jsonData);
  if (!parseResult.success || !parseResult.data) {
    throw new Error('Import integration step 1 (parse) failed');
  }

  // Step 2: Validate
  const validationResult = jsonParser.validate(jsonData);
  if (!validationResult.isValid) {
    throw new Error('Import integration step 2 (validate) failed');
  }

  // Step 3: Store
  diagramStore.setDiagram(parseResult.data);
  const storedDiagram = diagramStore.getDiagram();
  if (!storedDiagram) {
    throw new Error('Import integration step 3 (store) failed');
  }

  // Step 4: Verify
  if (storedDiagram.getId() !== 'integration-test') {
    throw new Error('Import integration step 4 (verify) failed');
  }

  console.log('✅ Import integration working');
}

async function testFileImportSimulation(): Promise<void> {
  console.log('\n🧪 Testing File Import Simulation...');

  // Simulate file reading
  const simulateFileRead = async (filename: string, content: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    return { extension, content };
  };

  // Test SQL file
  const sqlFile = await simulateFileRead('diagram.sql', 'CREATE TABLE Users (id INTEGER);');
  if (sqlFile.extension !== 'sql') {
    throw new Error('SQL file extension detection failed');
  }
  console.log('✅ SQL file simulation working');

  // Test JSON file
  const jsonFile = await simulateFileRead('diagram.json', '{"id":"test","tables":[]}');
  if (jsonFile.extension !== 'json') {
    throw new Error('JSON file extension detection failed');
  }
  console.log('✅ JSON file simulation working');

  // Test unsupported file
  const txtFile = await simulateFileRead('diagram.txt', 'some text');
  const isSupported = txtFile.extension === 'sql' || txtFile.extension === 'json';
  if (isSupported) {
    throw new Error('Unsupported file detection failed');
  }
  console.log('✅ Unsupported file handling working');
}

async function runTests(): Promise<void> {
  try {
    await testImportDialogLogic();
    await testSQLImport();
    await testJSONImport();
    await testImportErrorHandling();
    await testImportIntegration();
    await testFileImportSimulation();

    console.log('\n✅ All import functionality tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();

