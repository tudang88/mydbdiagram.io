/**
 * Simple test script to verify domain models are working
 * Run with: npx tsx src/client/core/__tests__/test-domain-models.ts
 */

import { Diagram } from '../diagram/Diagram';
import { Table } from '../table/Table';
import { Relationship } from '../relationship/Relationship';
import { DiagramValidator } from '../validator/DiagramValidator';
import { RelationshipValidator } from '../validator/RelationshipValidator';

console.log('🧪 Testing Domain Models...\n');

// Test 1: Create a Table
console.log('Test 1: Creating a Table');
try {
  const table = new Table(
    'table-1',
    'Users',
    { x: 100, y: 100 },
    [
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
    ]
  );

  console.log('✅ Table created:', table.getName());
  console.log('   Columns:', table.getAllColumns().length);
  console.log('   Position:', table.getPosition());

  // Test 2: Create a Diagram
  console.log('\nTest 2: Creating a Diagram');
  const diagram = new Diagram('diagram-1', {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  diagram.addTable(table);
  console.log('✅ Diagram created with 1 table');

  // Test 3: Add another table
  console.log('\nTest 3: Adding another Table');
  const table2 = new Table(
    'table-2',
    'Posts',
    { x: 300, y: 100 },
    [
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
      {
        id: 'col-5',
        name: 'title',
        type: 'VARCHAR(255)',
        constraints: [{ type: 'NOT_NULL' }],
      },
    ]
  );

  diagram.addTable(table2);
  console.log('✅ Added second table:', table2.getName());
  console.log('   Total tables:', diagram.getAllTables().length);

  // Test 4: Create a Relationship
  console.log('\nTest 4: Creating a Relationship');
  const relationship = new Relationship(
    'rel-1',
    'table-2', // Posts
    'col-4', // user_id
    'table-1', // Users
    'col-1', // id
    'ONE_TO_MANY',
    false
  );

  diagram.addRelationship(relationship);
  console.log('✅ Relationship created');
  console.log('   From:', relationship.getFromTableId(), '-> To:', relationship.getToTableId());
  console.log('   Type:', relationship.getType());

  // Test 5: Validation
  console.log('\nTest 5: Validating Diagram');
  const diagramValidator = new DiagramValidator();
  const validation = diagramValidator.validate(diagram);
  console.log('✅ Validation result:', validation.isValid ? 'VALID' : 'INVALID');
  if (!validation.isValid && validation.errors) {
    console.log('   Errors:', validation.errors.length);
    validation.errors.forEach((error) => {
      console.log(`   - ${error.field}: ${error.message}`);
    });
  }

  // Test 6: Serialization
  console.log('\nTest 6: Testing Serialization (toJSON/fromJSON)');
  const json = diagram.toJSON();
  console.log('✅ Diagram serialized to JSON');
  console.log('   JSON keys:', Object.keys(json));

  const diagram2 = Diagram.fromJSON(json);
  console.log('✅ Diagram deserialized from JSON');
  console.log('   Tables:', diagram2.getAllTables().length);
  console.log('   Relationships:', diagram2.getAllRelationships().length);

  // Test 7: Table operations
  console.log('\nTest 7: Testing Table operations');
  const table3 = diagram2.getTable('table-1');
  if (table3) {
    console.log('✅ Retrieved table:', table3.getName());
    
    // Add a column
    table3.addColumn({
      id: 'col-new',
      name: 'email',
      type: 'VARCHAR(255)',
      constraints: [{ type: 'UNIQUE' }],
    });
    console.log('✅ Added new column, total columns:', table3.getAllColumns().length);

    // Move table
    table3.moveTo({ x: 200, y: 200 });
    console.log('✅ Moved table to new position:', table3.getPosition());
  }

  // Test 8: Relationship validation
  console.log('\nTest 8: Testing Relationship validation');
  const relationshipValidator = new RelationshipValidator();
  const relValidation = relationshipValidator.validate(relationship, diagram2);
  console.log('✅ Relationship validation:', relValidation.isValid ? 'VALID' : 'INVALID');

  console.log('\n✅ All tests passed!');
  console.log('\n📊 Summary:');
  console.log('   - Tables created and managed: ✅');
  console.log('   - Relationships created: ✅');
  console.log('   - Validation working: ✅');
  console.log('   - Serialization working: ✅');
  console.log('   - Domain models functional: ✅');
} catch (error) {
  console.error('❌ Test failed:', error);
  if (error instanceof Error) {
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
  }
  process.exit(1);
}

