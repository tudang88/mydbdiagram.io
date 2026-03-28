/**
 * Unit tests for autoLayoutDiagram
 * Run with: npx tsx src/client/core/__tests__/test-auto-layout.ts
 */

import { Diagram } from '../diagram/Diagram';
import { Table } from '../table/Table';
import { Relationship } from '../relationship/Relationship';
import { applyAutoLayout } from '../diagram/autoLayoutDiagram';
import type { Column } from '@/types/table.types';

function col(id: string, name: string, type: string): Column {
  return { id, name, type, constraints: [] };
}

async function testIsolatedTablesDoNotOverlap(): Promise<void> {
  const d = Diagram.create('d1');
  const a = new Table('t-a', 'A', { x: 0, y: 0 }, [col('c1', 'id', 'int')]);
  const b = new Table('t-b', 'B', { x: 0, y: 0 }, [col('c2', 'id', 'int')]);
  d.addTable(a);
  d.addTable(b);
  applyAutoLayout(d);
  const pa = a.getPosition();
  const pb = b.getPosition();
  if (pa.x === pb.x && pa.y === pb.y) {
    throw new Error('Isolated tables should not share the same position');
  }
  console.log('✅ Isolated tables spaced');
}

async function testChainLayersVertically(): Promise<void> {
  const d = Diagram.create('d2');
  const users = new Table('t-u', 'users', { x: 0, y: 0 }, [col('c1', 'id', 'int')]);
  const posts = new Table('t-p', 'posts', { x: 0, y: 0 }, [
    col('c1', 'id', 'int'),
    col('c2', 'user_id', 'int'),
  ]);
  d.addTable(users);
  d.addTable(posts);
  d.addRelationship(
    new Relationship('r1', posts.getId(), 'c2', users.getId(), 'c1', 'ONE_TO_MANY', false)
  );
  applyAutoLayout(d);
  const yu = users.getPosition().y;
  const yp = posts.getPosition().y;
  if (yu === yp) {
    throw new Error('Expected FK chain to use different Y layers');
  }
  console.log('✅ FK chain uses vertical layers');
}

async function run(): Promise<void> {
  console.log('\n🧪 autoLayoutDiagram tests');
  await testIsolatedTablesDoNotOverlap();
  await testChainLayersVertically();
  console.log('✅ autoLayoutDiagram tests passed');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
