/**
 * Unit tests for Parsers (JSONParser, SQLParser, DBMLParser)
 * Run with: npx tsx src/client/__tests__/test-parsers.ts
 */

import { JSONParser } from '../core/parser/JSONParser';
import { SQLParser } from '../core/parser/SQLParser';
import { DBMLParser } from '../core/parser/DBMLParser';
import { Diagram } from '../core/diagram/Diagram';
import * as fs from 'fs';
import * as path from 'path';

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

  // Test table-level constraints with named CONSTRAINT foreign keys
  const complexSQL = `
    CREATE TABLE m_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE m_roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL
    );

    CREATE TABLE m_model_has_roles (
      id SERIAL PRIMARY KEY,
      role_id INTEGER NOT NULL,
      model_id INTEGER NOT NULL,
      CONSTRAINT uq_model_has_roles_unique UNIQUE (role_id, model_id),
      CONSTRAINT fk_model_has_roles_role FOREIGN KEY (role_id) REFERENCES m_roles(id),
      CONSTRAINT fk_model_has_roles_model FOREIGN KEY (model_id) REFERENCES m_users(id)
    );
  `;

  const complexResult = parser.parse(complexSQL);
  if (!complexResult.success || !complexResult.data) {
    throw new Error('SQLParser failed to parse complex SQL constraints');
  }

  const complexDiagram = complexResult.data;
  const complexTables = complexDiagram.getAllTables();
  const modelHasRoles = complexTables.find(t => t.getName() === 'm_model_has_roles');
  if (!modelHasRoles) {
    throw new Error('SQLParser failed to parse m_model_has_roles table');
  }

  const roleIdCol = modelHasRoles.getAllColumns().find(c => c.name === 'role_id');
  const modelIdCol = modelHasRoles.getAllColumns().find(c => c.name === 'model_id');
  if (!roleIdCol || !modelIdCol) {
    throw new Error('SQLParser failed to parse role_id/model_id columns');
  }

  if (!roleIdCol.constraints.some((c: { type: string }) => c.type === 'FOREIGN_KEY')) {
    throw new Error('SQLParser failed to parse named CONSTRAINT foreign key for role_id');
  }
  if (!modelIdCol.constraints.some((c: { type: string }) => c.type === 'FOREIGN_KEY')) {
    throw new Error('SQLParser failed to parse named CONSTRAINT foreign key for model_id');
  }
  if (!roleIdCol.constraints.some((c: { type: string }) => c.type === 'UNIQUE')) {
    throw new Error('SQLParser failed to parse table-level UNIQUE constraint');
  }
  if (!modelIdCol.constraints.some((c: { type: string }) => c.type === 'UNIQUE')) {
    throw new Error('SQLParser failed to parse table-level UNIQUE constraint');
  }

  const complexRels = complexDiagram.getAllRelationships();
  if (complexRels.length < 2) {
    throw new Error('SQLParser should create relationships from named CONSTRAINT foreign keys');
  }
  console.log('✅ Table-level CONSTRAINT parsing working');

  // Test COMMENT ON TABLE/COLUMN parsing
  const sqlWithComments = `
    CREATE TABLE m_companies (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(42) NOT NULL
    );

    COMMENT ON TABLE m_companies IS '会社マスター';
    COMMENT ON COLUMN m_companies.company_name IS '会社名';
  `;

  const commentsResult = parser.parse(sqlWithComments);
  if (!commentsResult.success || !commentsResult.data) {
    throw new Error('SQLParser failed to parse SQL comments');
  }

  const commentsTable = commentsResult.data.getAllTables().find(t => t.getName() === 'm_companies');
  if (!commentsTable) {
    throw new Error('SQLParser failed to parse commented table');
  }

  const commentsTableMetadata = commentsTable.getMetadata();
  if (!commentsTableMetadata?.description || commentsTableMetadata.description !== '会社マスター') {
    throw new Error('SQLParser failed to parse COMMENT ON TABLE');
  }

  const commentsColumn = commentsTable.getAllColumns().find(c => c.name === 'company_name');
  if (!commentsColumn || commentsColumn.comment !== '会社名') {
    throw new Error('SQLParser failed to parse COMMENT ON COLUMN');
  }
  console.log('✅ COMMENT ON TABLE/COLUMN parsing working');
}

async function testDBMLParser(): Promise<void> {
  console.log(
    '\n🧪 Testing DBMLParser (econtract-style: quoted names, inline ref, default, increment)...'
  );

  const parser = new DBMLParser();

  // T1: Quoted table name (multi-line so column is on its own line)
  const r1 = parser.parse('Table "m_users" {\n  "id" serial [pk, increment]\n}');
  if (!r1.success || !r1.data) throw new Error('DBMLParser: quoted table parse failed');
  const t1 = r1.data.getAllTables();
  if (t1.length !== 1 || t1[0].getName() !== 'm_users')
    throw new Error('DBMLParser T1: expected one table m_users');
  const c1 = t1[0].getAllColumns();
  if (c1.length !== 1 || c1[0].name !== 'id') throw new Error('DBMLParser T1: expected column id');
  console.log('✅ T1 Quoted table name');

  // T2: Quoted column names + type with parentheses
  const r2 = parser.parse('Table "t" {\n  "email" VARCHAR(50) [unique]\n}');
  if (!r2.success || !r2.data) throw new Error('DBMLParser: quoted column parse failed');
  const col2 = r2.data.getAllTables()[0].getAllColumns()[0];
  if (!col2 || col2.name !== 'email' || col2.type !== 'VARCHAR(50)')
    throw new Error('DBMLParser T2: column name/type');
  console.log('✅ T2 Quoted column names');

  // T3: Inline ref ref: > "table"."col"
  const r3 = parser.parse(`
Table "m_users" {
  "id" serial [pk]
}
Table "m_posts" {
  "id" serial [pk]
  "user_id" integer [ref: > "m_users"."id"]
}
`);
  if (!r3.success || !r3.data) throw new Error('DBMLParser: inline ref parse failed');
  const rels3 = r3.data.getAllRelationships();
  if (rels3.length < 1)
    throw new Error('DBMLParser T3: expected at least one relationship from inline ref');
  console.log('✅ T3 Inline ref ref: > "table"."col"');

  // T4: Inline ref ref: < (reverse direction)
  const r4 = parser.parse(`
Table "a" {
  "id" serial [pk]
  "b_id" int [ref: < "b"."id"]
}
Table "b" {
  "id" serial [pk]
}
`);
  if (!r4.success || !r4.data) throw new Error('DBMLParser: inline ref < parse failed');
  const rels4 = r4.data.getAllRelationships();
  if (rels4.length < 1) throw new Error('DBMLParser T4: expected relationship');
  console.log('✅ T4 Inline ref ref: <');

  // T5: Constraint increment -> AUTO_INCREMENT
  const r5 = parser.parse('Table "t" {\n  "id" serial [pk, increment]\n}');
  if (!r5.success || !r5.data) throw new Error('DBMLParser: increment parse failed');
  const col5 = r5.data.getAllTables()[0].getAllColumns()[0];
  const hasIncrement = col5.constraints.some((c: { type: string }) => c.type === 'AUTO_INCREMENT');
  if (!hasIncrement) throw new Error('DBMLParser T5: expected AUTO_INCREMENT constraint');
  console.log('✅ T5 Constraint increment');

  // T6: Default boolean/number
  const r6 = parser.parse(
    'Table "t" {\n  "flag" boolean [default: true]\n  "n" int [default: 0]\n}'
  );
  if (!r6.success || !r6.data) throw new Error('DBMLParser: default parse failed');
  const cols6 = r6.data.getAllTables()[0].getAllColumns();
  const flagCol = cols6.find((c: { name: string }) => c.name === 'flag');
  const nCol = cols6.find((c: { name: string }) => c.name === 'n');
  if (!flagCol || flagCol.defaultValue !== 'true') throw new Error('DBMLParser T6: default true');
  if (!nCol || nCol.defaultValue !== '0') throw new Error('DBMLParser T6: default 0');
  console.log('✅ T6 Default boolean/number');

  // T7: Default quoted string
  const r7 = parser.parse('Table "t" {\n  "guard" varchar(255) [default: \'api\']\n}');
  if (!r7.success || !r7.data) throw new Error('DBMLParser: default string parse failed');
  const guardCol = r7.data.getAllTables()[0].getAllColumns()[0];
  if (!guardCol.defaultValue || !guardCol.defaultValue.includes('api'))
    throw new Error('DBMLParser T7: default string');
  console.log('✅ T7 Default quoted string');

  // T8: Default backtick (e.g. CURRENT_TIMESTAMP)
  const r8 = parser.parse('Table "t" {\n  "created" timestamp [default: `CURRENT_TIMESTAMP`]\n}');
  if (!r8.success || !r8.data) throw new Error('DBMLParser: default backtick parse failed');
  const createdCol = r8.data.getAllTables()[0].getAllColumns()[0];
  if (createdCol.defaultValue !== 'CURRENT_TIMESTAMP')
    throw new Error('DBMLParser T8: default backtick');
  console.log('✅ T8 Default backtick');

  // T9: canParse quoted Table
  if (!parser.canParse('Table "x" { }')) throw new Error('DBMLParser T9: canParse quoted table');
  console.log('✅ T9 canParse quoted Table');

  // T10: Type DECIMAL(10,2)
  const r10 = parser.parse('Table "t" {\n  "amount" DECIMAL(10,2)\n}');
  if (!r10.success || !r10.data) throw new Error('DBMLParser: DECIMAL type failed');
  const amountCol = r10.data.getAllTables()[0].getAllColumns()[0];
  if (amountCol.type !== 'DECIMAL(10,2)') throw new Error('DBMLParser T10: DECIMAL(10,2)');
  console.log('✅ T10 Type DECIMAL(10,2)');

  // T14: Regression - unquoted (legacy) DBML still works
  const r14 = parser.parse('Table users {\n  id integer [pk]\n}');
  if (!r14.success || !r14.data) throw new Error('DBMLParser: legacy unquoted failed');
  const t14 = r14.data.getAllTables()[0];
  if (t14.getName() !== 'users' || t14.getAllColumns()[0].name !== 'id')
    throw new Error('DBMLParser T14: legacy format');
  console.log('✅ T14 Regression unquoted DBML');

  // T15: Standalone Ref still works
  const r15 = parser.parse(`
Table a {
  id serial [pk]
}
Table b {
  id serial [pk]
  a_id int
}
Ref: b.a_id > a.id
`);
  if (!r15.success || !r15.data) throw new Error('DBMLParser: standalone Ref failed');
  if (r15.data.getAllRelationships().length < 1) throw new Error('DBMLParser T15: standalone Ref');
  console.log('✅ T15 Standalone Ref');

  // Validation
  const validation = parser.validate('Table "m_users" { "id" serial [pk] }');
  if (!validation.isValid) throw new Error('DBMLParser validation failed');
  console.log('✅ DBMLParser validation');

  console.log('✅ All DBMLParser tests passed');
}

async function testDBMLParserEcontractFile(): Promise<void> {
  const filePath = path.join(process.env.HOME || '', 'Downloads', 'econtract_database_2 1.dbml');
  if (!fs.existsSync(filePath)) {
    console.log('\n⏭️  Skipping econtract file test (file not found at ' + filePath + ')');
    return;
  }
  console.log('\n🧪 Testing DBMLParser with full econtract_database_2 1.dbml...');
  const content = fs.readFileSync(filePath, 'utf8');
  const parser = new DBMLParser();
  const result = parser.parse(content);
  if (!result.success || !result.data) {
    throw new Error('Econtract file parse failed: ' + JSON.stringify(result.errors));
  }
  const tables = result.data.getAllTables();
  const relationships = result.data.getAllRelationships();
  if (tables.length < 40) throw new Error('Expected at least 40 tables, got ' + tables.length);
  if (relationships.length < 50)
    throw new Error('Expected at least 50 relationships, got ' + relationships.length);
  const mUsers = tables.find(t => t.getName() === 'm_users');
  const personalOwners = tables.find(t => t.getName() === 'm_personal_owners');
  if (!mUsers || !personalOwners) throw new Error('Expected m_users and m_personal_owners tables');
  const relUserToPersonal = relationships.find(
    r =>
      (result.data!.getTable(r.getFromTableId())?.getName() === 'm_personal_owners' &&
        result.data!.getTable(r.getToTableId())?.getName() === 'm_users') ||
      (result.data!.getTable(r.getToTableId())?.getName() === 'm_personal_owners' &&
        result.data!.getTable(r.getFromTableId())?.getName() === 'm_users')
  );
  if (!relUserToPersonal)
    throw new Error('Expected relationship between m_personal_owners and m_users');
  const isActiveCol = mUsers.getAllColumns().find(c => c.name === 'is_active');
  if (!isActiveCol?.defaultValue) throw new Error('Expected is_active to have default value');
  console.log(
    '✅ Econtract file: ' + tables.length + ' tables, ' + relationships.length + ' relationships'
  );
}

async function runTests(): Promise<void> {
  try {
    await testJSONParser();
    await testSQLParser();
    await testDBMLParser();
    await testDBMLParserEcontractFile();

    console.log('\n✅ All parser tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
