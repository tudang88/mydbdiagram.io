/**
 * Unit tests for Validator classes
 * Run with: npx tsx src/client/core/__tests__/test-validators.ts
 */

import { DiagramValidator } from '../validator/DiagramValidator';
import { TableValidator } from '../validator/TableValidator';
import { RelationshipValidator } from '../validator/RelationshipValidator';
import { Diagram } from '../diagram/Diagram';
import { Table } from '../table/Table';
import { Relationship } from '../relationship/Relationship';
import { Column } from '../../types/table.types';

async function testDiagramValidator(): Promise<void> {
  console.log('\n🧪 Testing DiagramValidator...');

  const validator = new DiagramValidator();

  // Test valid diagram
  const validDiagram = Diagram.create('test-1');
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  table.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  validDiagram.addTable(table);

  const validResult = validator.validate(validDiagram);
  if (!validResult.isValid) {
    throw new Error('Valid diagram should pass validation');
  }
  console.log('✅ Valid diagram validation passed');

  // Test invalid diagram - missing ID
  const invalidDiagram1 = new Diagram('', {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const invalidResult1 = validator.validate(invalidDiagram1);
  if (invalidResult1.isValid) {
    throw new Error('Diagram with empty ID should fail validation');
  }
  if (!invalidResult1.errors || invalidResult1.errors.length === 0) {
    throw new Error('Should have validation errors');
  }
  console.log('✅ Invalid diagram (empty ID) validation failed correctly');

  // Test invalid diagram - no tables
  const invalidDiagram2 = Diagram.create('test-2');
  const invalidResult2 = validator.validate(invalidDiagram2);
  if (invalidResult2.isValid) {
    throw new Error('Diagram with no tables should fail validation');
  }
  console.log('✅ Invalid diagram (no tables) validation failed correctly');

  // Test invalid diagram - missing metadata
  const invalidDiagram3 = new Diagram('test-3', {
    createdAt: '',
    updatedAt: new Date().toISOString(),
  });
  const table3 = new Table('table-3', 'Users', { x: 100, y: 100 });
  table3.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  invalidDiagram3.addTable(table3);
  const invalidResult3 = validator.validate(invalidDiagram3);
  if (invalidResult3.isValid) {
    throw new Error('Diagram with missing createdAt should fail validation');
  }
  console.log('✅ Invalid diagram (missing metadata) validation failed correctly');

  // Test invalid diagram - invalid table (table with no columns will fail)
  const invalidDiagram4 = Diagram.create('test-4');
  const invalidTable = new Table('table-4', 'Users', { x: 100, y: 100 });
  // Table without columns should fail validation
  invalidDiagram4.addTable(invalidTable);
  const invalidResult4 = validator.validate(invalidDiagram4);
  // TableValidator requires at least one column, so this should fail
  if (invalidResult4.isValid) {
    throw new Error('Diagram with table having no columns should fail validation');
  }
  console.log('✅ Invalid diagram (invalid table) validation failed correctly');

  // Test invalid diagram - invalid relationship
  const invalidDiagram5 = Diagram.create('test-5');
  const table5 = new Table('table-5', 'Users', { x: 100, y: 100 });
  table5.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  invalidDiagram5.addTable(table5);
  const invalidRel = new Relationship(
    'rel-1',
    'non-existent',
    'col-1',
    'table-5',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  invalidDiagram5.addRelationship(invalidRel);
  const invalidResult5 = validator.validate(invalidDiagram5);
  if (invalidResult5.isValid) {
    throw new Error('Diagram with invalid relationship should fail validation');
  }
  console.log('✅ Invalid diagram (invalid relationship) validation failed correctly');
}

async function testTableValidator(): Promise<void> {
  console.log('\n🧪 Testing TableValidator...');

  const validator = new TableValidator();

  // Test valid table
  const validTable = new Table('table-1', 'Users', { x: 100, y: 100 });
  validTable.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  const validResult = validator.validate(validTable);
  if (!validResult.isValid) {
    throw new Error('Valid table should pass validation');
  }
  console.log('✅ Valid table validation passed');

  // Test invalid table - empty ID
  const invalidTable1 = new Table('', 'Users', { x: 100, y: 100 });
  invalidTable1.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  const invalidResult1 = validator.validate(invalidTable1);
  if (invalidResult1.isValid) {
    throw new Error('Table with empty ID should fail validation');
  }
  console.log('✅ Invalid table (empty ID) validation failed correctly');

  // Test invalid table - empty name
  const invalidTable2 = new Table('table-2', '', { x: 100, y: 100 });
  invalidTable2.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  const invalidResult2 = validator.validate(invalidTable2);
  if (invalidResult2.isValid) {
    throw new Error('Table with empty name should fail validation');
  }
  console.log('✅ Invalid table (empty name) validation failed correctly');

  // Test invalid table - name too long
  const longName = 'a'.repeat(101);
  const invalidTable3 = new Table('table-3', longName, { x: 100, y: 100 });
  invalidTable3.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  const invalidResult3 = validator.validate(invalidTable3);
  if (invalidResult3.isValid) {
    throw new Error('Table with name > 100 chars should fail validation');
  }
  console.log('✅ Invalid table (name too long) validation failed correctly');

  // Test invalid table - negative position
  const invalidTable4 = new Table('table-4', 'Users', { x: -1, y: 100 });
  invalidTable4.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  const invalidResult4 = validator.validate(invalidTable4);
  if (invalidResult4.isValid) {
    throw new Error('Table with negative position should fail validation');
  }
  console.log('✅ Invalid table (negative position) validation failed correctly');

  // Test invalid table - no columns
  const invalidTable5 = new Table('table-5', 'Users', { x: 100, y: 100 });
  const invalidResult5 = validator.validate(invalidTable5);
  if (invalidResult5.isValid) {
    throw new Error('Table with no columns should fail validation');
  }
  console.log('✅ Invalid table (no columns) validation failed correctly');

  // Test invalid table - duplicate column names
  const invalidTable6 = new Table('table-6', 'Users', { x: 100, y: 100 });
  invalidTable6.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  invalidTable6.addColumn({
    id: 'col-2',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  const invalidResult6 = validator.validate(invalidTable6);
  if (invalidResult6.isValid) {
    throw new Error('Table with duplicate column names should fail validation');
  }
  console.log('✅ Invalid table (duplicate column names) validation failed correctly');

  // Test invalid table - empty column name
  const invalidTable7 = new Table('table-7', 'Users', { x: 100, y: 100 });
  invalidTable7.addColumn({
    id: 'col-1',
    name: '',
    type: 'INTEGER',
    constraints: [],
  });
  const invalidResult7 = validator.validate(invalidTable7);
  if (invalidResult7.isValid) {
    throw new Error('Table with empty column name should fail validation');
  }
  console.log('✅ Invalid table (empty column name) validation failed correctly');

  // Test invalid table - empty column type
  const invalidTable8 = new Table('table-8', 'Users', { x: 100, y: 100 });
  invalidTable8.addColumn({
    id: 'col-1',
    name: 'id',
    type: '',
    constraints: [],
  });
  const invalidResult8 = validator.validate(invalidTable8);
  if (invalidResult8.isValid) {
    throw new Error('Table with empty column type should fail validation');
  }
  console.log('✅ Invalid table (empty column type) validation failed correctly');
}

async function testRelationshipValidator(): Promise<void> {
  console.log('\n🧪 Testing RelationshipValidator...');

  const validator = new RelationshipValidator();

  // Setup valid diagram
  const diagram = Diagram.create('test-diagram');
  const table1 = new Table('table-1', 'Users', { x: 100, y: 100 });
  const table2 = new Table('table-2', 'Posts', { x: 400, y: 100 });
  table1.addColumn({
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [],
  });
  table2.addColumn({
    id: 'col-2',
    name: 'user_id',
    type: 'INTEGER',
    constraints: [],
  });
  diagram.addTable(table1);
  diagram.addTable(table2);

  // Test valid relationship
  const validRel = new Relationship(
    'rel-1',
    'table-2',
    'col-2',
    'table-1',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  const validResult = validator.validate(validRel, diagram);
  if (!validResult.isValid) {
    throw new Error('Valid relationship should pass validation');
  }
  console.log('✅ Valid relationship validation passed');

  // Test invalid relationship - empty ID
  const invalidRel1 = new Relationship(
    '',
    'table-2',
    'col-2',
    'table-1',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  const invalidResult1 = validator.validate(invalidRel1, diagram);
  if (invalidResult1.isValid) {
    throw new Error('Relationship with empty ID should fail validation');
  }
  console.log('✅ Invalid relationship (empty ID) validation failed correctly');

  // Test invalid relationship - non-existent from table
  const invalidRel2 = new Relationship(
    'rel-2',
    'non-existent',
    'col-2',
    'table-1',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  const invalidResult2 = validator.validate(invalidRel2, diagram);
  if (invalidResult2.isValid) {
    throw new Error('Relationship with non-existent from table should fail validation');
  }
  console.log('✅ Invalid relationship (non-existent from table) validation failed correctly');

  // Test invalid relationship - non-existent to table
  const invalidRel3 = new Relationship(
    'rel-3',
    'table-2',
    'col-2',
    'non-existent',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  const invalidResult3 = validator.validate(invalidRel3, diagram);
  if (invalidResult3.isValid) {
    throw new Error('Relationship with non-existent to table should fail validation');
  }
  console.log('✅ Invalid relationship (non-existent to table) validation failed correctly');

  // Test invalid relationship - non-existent from column
  const invalidRel4 = new Relationship(
    'rel-4',
    'table-2',
    'non-existent',
    'table-1',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  const invalidResult4 = validator.validate(invalidRel4, diagram);
  if (invalidResult4.isValid) {
    throw new Error('Relationship with non-existent from column should fail validation');
  }
  console.log('✅ Invalid relationship (non-existent from column) validation failed correctly');

  // Test invalid relationship - non-existent to column
  const invalidRel5 = new Relationship(
    'rel-5',
    'table-2',
    'col-2',
    'table-1',
    'non-existent',
    'ONE_TO_MANY',
    false
  );
  const invalidResult5 = validator.validate(invalidRel5, diagram);
  if (invalidResult5.isValid) {
    throw new Error('Relationship with non-existent to column should fail validation');
  }
  console.log('✅ Invalid relationship (non-existent to column) validation failed correctly');

  // Test invalid relationship - invalid type
  const invalidRel6 = new Relationship(
    'rel-6',
    'table-2',
    'col-2',
    'table-1',
    'col-1',
    'INVALID_TYPE' as any,
    false
  );
  const invalidResult6 = validator.validate(invalidRel6, diagram);
  if (invalidResult6.isValid) {
    throw new Error('Relationship with invalid type should fail validation');
  }
  console.log('✅ Invalid relationship (invalid type) validation failed correctly');

  // Test invalid relationship - self-referencing
  const invalidRel7 = new Relationship(
    'rel-7',
    'table-1',
    'col-1',
    'table-1',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  const invalidResult7 = validator.validate(invalidRel7, diagram);
  if (invalidResult7.isValid) {
    throw new Error('Self-referencing relationship should fail validation');
  }
  console.log('✅ Invalid relationship (self-referencing) validation failed correctly');
}

async function runTests(): Promise<void> {
  try {
    await testDiagramValidator();
    await testTableValidator();
    await testRelationshipValidator();

    console.log('\n✅ All validator tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();

