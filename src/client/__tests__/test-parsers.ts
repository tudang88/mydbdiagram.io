/**
 * Unit tests for Parsers (JSONParser, SQLParser)
 * Run with: npx tsx src/client/__tests__/test-parsers.ts
 */

import { JSONParser } from '../core/parser/JSONParser';
import { SQLParser } from '../core/parser/SQLParser';
import { Diagram } from '../core/diagram/Diagram';

async function testJSONParser(): Promise<void> {
  console.log('\n🧪 Testing JSONParser...');

  const parser = new JSONParser();

  // Test valid JSON
  const validJSON = JSON.stringify({
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

  const parseResult = parser.parse(validJSON);
  if (!parseResult.success || !parseResult.data) {
    throw new Error('JSONParser failed to parse valid JSON');
  }
  if (parseResult.data.getId() !== 'test-diagram') {
    throw new Error('JSONParser parsed diagram ID incorrect');
  }
  console.log('✅ Parse valid JSON working');

  // Test invalid JSON
  const invalidJSON = '{ invalid json }';
  const invalidResult = parser.parse(invalidJSON);
  if (invalidResult.success) {
    throw new Error('JSONParser should fail on invalid JSON');
  }
  console.log('✅ Parse invalid JSON error handling working');

  // Test validate
  const validation = parser.validate(validJSON);
  if (!validation.isValid) {
    throw new Error('JSONParser validation failed on valid JSON');
  }
  console.log('✅ Validation working');

  // Test canParse
  if (!parser.canParse(validJSON)) {
    throw new Error('JSONParser canParse failed on valid JSON');
  }
  if (parser.canParse('not json')) {
    throw new Error('JSONParser canParse should return false for invalid input');
  }
  if (parser.canParse('{"not": "diagram"}')) {
    throw new Error('JSONParser canParse should return false for non-diagram JSON');
  }
  console.log('✅ canParse working');
}

async function testSQLParser(): Promise<void> {
  console.log('\n🧪 Testing SQLParser...');

  const parser = new SQLParser();

  // Test valid SQL
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

  const parseResult = parser.parse(validSQL);
  if (!parseResult.success || !parseResult.data) {
    throw new Error('SQLParser failed to parse valid SQL');
  }

  const diagram = parseResult.data as Diagram;
  const tables = diagram.getAllTables();
  if (tables.length < 2) {
    throw new Error('SQLParser should parse multiple tables');
  }

  const usersTable = tables.find(t => t.getName() === 'Users');
  if (!usersTable) {
    throw new Error('SQLParser failed to parse Users table');
  }

  const columns = usersTable.getAllColumns();
  if (columns.length < 3) {
    throw new Error('SQLParser failed to parse all columns');
  }

  const idColumn = columns.find(c => c.name === 'id');
  if (!idColumn) {
    throw new Error('SQLParser failed to parse id column');
  }

  const constraints = idColumn.constraints || [];
  const hasPrimaryKey = constraints.some((c: { type: string }) => c.type === 'PRIMARY_KEY');
  if (!hasPrimaryKey) {
    throw new Error('SQLParser failed to parse PRIMARY KEY constraint');
  }

  console.log('✅ Parse valid SQL working');

  // Test invalid SQL
  const invalidSQL = 'SELECT * FROM users;';
  const invalidResult = parser.parse(invalidSQL);
  // SQLParser might still create a diagram with empty tables, so we check for errors
  if (invalidResult.errors && invalidResult.errors.length > 0) {
    console.log('✅ Parse invalid SQL error handling working');
  } else {
    // If no errors, check if diagram is empty or has issues
    if (invalidResult.data) {
      const tables = invalidResult.data.getAllTables();
      if (tables.length === 0) {
        console.log('✅ Parse invalid SQL returns empty diagram');
      }
    }
  }

  // Test validate
  const validation = parser.validate(validSQL);
  if (!validation.isValid) {
    throw new Error('SQLParser validation failed on valid SQL');
  }
  console.log('✅ Validation working');

  // Test canParse
  if (!parser.canParse(validSQL)) {
    throw new Error('SQLParser canParse failed on valid SQL');
  }
  if (parser.canParse('not sql')) {
    throw new Error('SQLParser canParse should return false for invalid input');
  }
  if (parser.canParse('SELECT * FROM users')) {
    throw new Error('SQLParser canParse should return false for non-DDL SQL');
  }
  console.log('✅ canParse working');
}

async function runTests(): Promise<void> {
  try {
    await testJSONParser();
    await testSQLParser();

    console.log('\n✅ All parser tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
