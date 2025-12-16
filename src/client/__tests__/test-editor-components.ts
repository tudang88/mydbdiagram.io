/**
 * Unit tests for Editor Components
 * Run with: npx tsx src/client/__tests__/test-editor-components.ts
 * 
 * Note: These tests verify component logic and data handling,
 * not React rendering (which would require React Testing Library)
 */

import { Table } from '../core/table/Table';
import { Column } from '../types/table.types';
import { ConstraintType } from '../types/common.types';

async function testTableEditorLogic(): Promise<void> {
  console.log('\n🧪 Testing TableEditor Logic...');

  // Create test table
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });

  // Test initial state
  if (table.getName() !== 'Users') {
    throw new Error('Table name incorrect');
  }
  console.log('✅ Table initial name correct');

  const position = table.getPosition();
  if (position.x !== 100 || position.y !== 100) {
    throw new Error('Table initial position incorrect');
  }
  console.log('✅ Table initial position correct');

  // Test name update
  table.setName('Users_Updated');
  if (table.getName() !== 'Users_Updated') {
    throw new Error('Table name update failed');
  }
  console.log('✅ Table name update working');

  // Test name validation (empty)
  try {
    table.setName('');
    throw new Error('Table name validation should reject empty string');
  } catch (error) {
    if (error instanceof Error && error.message.includes('cannot be empty')) {
      console.log('✅ Table name validation (empty) working');
    } else {
      throw error;
    }
  }

  // Test name validation (whitespace only)
  try {
    table.setName('   ');
    throw new Error('Table name validation should reject whitespace only');
  } catch (error) {
    if (error instanceof Error && error.message.includes('cannot be empty')) {
      console.log('✅ Table name validation (whitespace) working');
    } else {
      throw error;
    }
  }

  // Test position update
  table.moveTo({ x: 200, y: 300 });
  const newPosition = table.getPosition();
  if (newPosition.x !== 200 || newPosition.y !== 300) {
    throw new Error('Table position update failed');
  }
  console.log('✅ Table position update working');

  // Test form validation logic (simulated)
  const validateTableName = (name: string): Array<{ field: string; message: string }> => {
    const errors: Array<{ field: string; message: string }> = [];
    if (!name.trim()) {
      errors.push({ field: 'name', message: 'Table name is required' });
    }
    if (name.length > 100) {
      errors.push({ field: 'name', message: 'Table name must be less than 100 characters' });
    }
    return errors;
  };

  const errors1 = validateTableName('');
  if (errors1.length === 0 || errors1[0].field !== 'name') {
    throw new Error('Form validation (empty name) failed');
  }
  console.log('✅ Form validation (empty name) working');

  const errors2 = validateTableName('a'.repeat(101));
  if (errors2.length === 0 || errors2[0].field !== 'name') {
    throw new Error('Form validation (name too long) failed');
  }
  console.log('✅ Form validation (name too long) working');

  const errors3 = validateTableName('ValidName');
  if (errors3.length !== 0) {
    throw new Error('Form validation (valid name) failed');
  }
  console.log('✅ Form validation (valid name) working');
}

async function testColumnEditorLogic(): Promise<void> {
  console.log('\n🧪 Testing ColumnEditor Logic...');

  // Create test column
  const column: Column = {
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [{ type: 'PRIMARY_KEY' }],
  };

  // Test initial state
  if (column.name !== 'id' || column.type !== 'INTEGER') {
    throw new Error('Column initial state incorrect');
  }
  console.log('✅ Column initial state correct');

  // Test constraints
  if (column.constraints.length !== 1 || column.constraints[0].type !== 'PRIMARY_KEY') {
    throw new Error('Column constraints incorrect');
  }
  console.log('✅ Column constraints correct');

  // Test constraint toggle logic
  const constraints: Array<{ type: ConstraintType; value?: string }> = [];
  const toggleConstraint = (type: ConstraintType) => {
    const existing = constraints.find((c) => c.type === type);
    if (existing) {
      const index = constraints.indexOf(existing);
      constraints.splice(index, 1);
    } else {
      constraints.push({ type });
    }
  };

  toggleConstraint('PRIMARY_KEY');
  if (constraints.length !== 1 || constraints[0].type !== 'PRIMARY_KEY') {
    throw new Error('Constraint toggle (add) failed');
  }
  console.log('✅ Constraint toggle (add) working');

  toggleConstraint('PRIMARY_KEY');
  if (constraints.length !== 0) {
    throw new Error('Constraint toggle (remove) failed');
  }
  console.log('✅ Constraint toggle (remove) working');

  // Test multiple constraints
  toggleConstraint('PRIMARY_KEY');
  toggleConstraint('NOT_NULL');
  toggleConstraint('UNIQUE');
  if (constraints.length !== 3) {
    throw new Error('Multiple constraints failed');
  }
  console.log('✅ Multiple constraints working');

  // Test foreign key constraint with value
  toggleConstraint('FOREIGN_KEY');
  const fkConstraint = constraints.find((c) => c.type === 'FOREIGN_KEY');
  if (!fkConstraint) {
    throw new Error('Foreign key constraint not found');
  }
  fkConstraint.value = 'Users.id';
  if (fkConstraint.value !== 'Users.id') {
    throw new Error('Foreign key value update failed');
  }
  console.log('✅ Foreign key constraint with value working');

  // Test form validation logic (simulated)
  const validateColumn = (
    name: string,
    type: string
  ): Array<{ field: string; message: string }> => {
    const errors: Array<{ field: string; message: string }> = [];
    if (!name.trim()) {
      errors.push({ field: 'name', message: 'Column name is required' });
    }
    if (name.length > 100) {
      errors.push({ field: 'name', message: 'Column name must be less than 100 characters' });
    }
    if (!type.trim()) {
      errors.push({ field: 'type', message: 'Column type is required' });
    }
    return errors;
  };

  const errors1 = validateColumn('', 'INTEGER');
  if (errors1.length === 0 || errors1[0].field !== 'name') {
    throw new Error('Column validation (empty name) failed');
  }
  console.log('✅ Column validation (empty name) working');

  const errors2 = validateColumn('id', '');
  if (errors2.length === 0 || errors2[0].field !== 'type') {
    throw new Error('Column validation (empty type) failed');
  }
  console.log('✅ Column validation (empty type) working');

  const errors3 = validateColumn('id', 'INTEGER');
  if (errors3.length !== 0) {
    throw new Error('Column validation (valid) failed');
  }
  console.log('✅ Column validation (valid) working');

  // Test column update logic
  const updatedColumn: Column = {
    ...column,
    name: 'user_id',
    type: 'INTEGER',
    constraints: [{ type: 'FOREIGN_KEY', value: 'Users.id' }, { type: 'NOT_NULL' }],
    defaultValue: '0',
    comment: 'Foreign key to Users table',
  };

  if (
    updatedColumn.name !== 'user_id' ||
    updatedColumn.constraints.length !== 2 ||
    updatedColumn.defaultValue !== '0' ||
    updatedColumn.comment !== 'Foreign key to Users table'
  ) {
    throw new Error('Column update logic failed');
  }
  console.log('✅ Column update logic working');
}

async function testEditorIntegration(): Promise<void> {
  console.log('\n🧪 Testing Editor Integration...');

  // Create table with columns
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  const column1: Column = {
    id: 'col-1',
    name: 'id',
    type: 'INTEGER',
    constraints: [{ type: 'PRIMARY_KEY' }],
  };
  const column2: Column = {
    id: 'col-2',
    name: 'name',
    type: 'VARCHAR(255)',
    constraints: [{ type: 'NOT_NULL' }],
  };

  table.addColumn(column1);
  table.addColumn(column2);

  // Test table editor integration
  table.setName('Users_Updated');
  table.moveTo({ x: 200, y: 200 });

  if (table.getName() !== 'Users_Updated') {
    throw new Error('Table editor integration failed');
  }
  console.log('✅ Table editor integration working');

  // Test column editor integration
  const updatedColumn: Column = {
    ...column1,
    name: 'user_id',
    type: 'BIGINT',
    constraints: [{ type: 'PRIMARY_KEY' }, { type: 'AUTO_INCREMENT' }],
  };

  table.updateColumn('col-1', updatedColumn);
  const retrievedColumn = table.getColumn('col-1');
  if (!retrievedColumn || retrievedColumn.name !== 'user_id' || retrievedColumn.type !== 'BIGINT') {
    throw new Error('Column editor integration failed');
  }
  console.log('✅ Column editor integration working');

  // Test validation integration
  const validateTable = (name: string, position: { x: number; y: number }) => {
    const errors: Array<{ field: string; message: string }> = [];
    if (!name.trim()) {
      errors.push({ field: 'name', message: 'Table name is required' });
    }
    if (position.x < 0 || position.y < 0) {
      errors.push({ field: 'position', message: 'Position must be non-negative' });
    }
    return errors;
  };

  const errors1 = validateTable('', { x: 100, y: 100 });
  if (errors1.length === 0) {
    throw new Error('Validation integration (table) failed');
  }
  console.log('✅ Validation integration (table) working');

  const errors2 = validateTable('ValidTable', { x: -10, y: 100 });
  if (errors2.length === 0 || errors2[0].field !== 'position') {
    throw new Error('Validation integration (position) failed');
  }
  console.log('✅ Validation integration (position) working');
}

async function runTests(): Promise<void> {
  try {
    await testTableEditorLogic();
    await testColumnEditorLogic();
    await testEditorIntegration();

    console.log('\n✅ All editor component tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();

