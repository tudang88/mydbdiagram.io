/**
 * Unit tests for State Management (DiagramStore, UIStore)
 * Run with: npx tsx src/client/__tests__/test-state-management.ts
 */

import { DiagramStore } from '../state/store/diagramStore';
import { UIStore } from '../state/store/uiStore';
import { Diagram } from '../core/diagram/Diagram';
import { Table } from '../core/table/Table';

async function testDiagramStore(): Promise<void> {
  console.log('\n🧪 Testing DiagramStore...');

  const store = new DiagramStore();

  // Test initial state
  const initial = store.getDiagram();
  if (initial !== null) {
    throw new Error('DiagramStore initial state should be null');
  }
  console.log('✅ Initial state correct');

  // Test setDiagram
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  const diagram = Diagram.create('diagram-1');
  diagram.addTable(table);
  store.setDiagram(diagram);

  const stored = store.getDiagram();
  if (!stored || stored.getId() !== 'diagram-1') {
    throw new Error('DiagramStore setDiagram failed');
  }
  console.log('✅ setDiagram working');

  // Test subscribe
  let notified = false;
  const unsubscribe = store.subscribe(diagram => {
    if (diagram && diagram.getId() === 'diagram-1') {
      notified = true;
    }
  });

  if (!notified) {
    throw new Error('DiagramStore subscribe immediate notification failed');
  }
  console.log('✅ Subscribe immediate notification working');

  // Test notification on change
  notified = false;
  const newDiagram = Diagram.create('diagram-2');
  store.setDiagram(newDiagram);

  // Give a moment for async notification (if any)
  await new Promise(resolve => setTimeout(resolve, 10));

  if (!notified) {
    // Check if diagram was updated
    const current = store.getDiagram();
    if (current && current.getId() === 'diagram-2') {
      notified = true;
    }
  }

  if (!notified) {
    throw new Error('DiagramStore notification on change failed');
  }
  console.log('✅ Notification on change working');

  // Test unsubscribe
  unsubscribe();
  store.setDiagram(null);
  const afterUnsubscribe = store.getDiagram();

  if (afterUnsubscribe !== null) {
    throw new Error('DiagramStore unsubscribe failed');
  }
  console.log('✅ Unsubscribe working');
}

async function testUIStore(): Promise<void> {
  console.log('\n🧪 Testing UIStore...');

  const store = new UIStore();

  // Test initial state
  const initialState = store.getState();
  if (initialState.zoomLevel !== 1 || initialState.selectedTableId !== null) {
    throw new Error('UIStore initial state incorrect');
  }
  console.log('✅ Initial state correct');

  // Test setState
  store.setState({ selectedTableId: 'table-1', zoomLevel: 1.5 });
  const updatedState = store.getState();
  if (updatedState.selectedTableId !== 'table-1' || updatedState.zoomLevel !== 1.5) {
    throw new Error('UIStore setState failed');
  }
  console.log('✅ setState working');

  // Test partial update
  store.setState({ zoomLevel: 2 });
  const partialState = store.getState();
  if (partialState.selectedTableId !== 'table-1' || partialState.zoomLevel !== 2) {
    throw new Error('UIStore partial update failed');
  }
  console.log('✅ Partial update working');

  // Test subscribe
  let notified = false;
  const unsubscribe = store.subscribe(state => {
    if (state.zoomLevel === 2) {
      notified = true;
    }
  });

  if (!notified) {
    throw new Error('UIStore subscribe immediate notification failed');
  }
  console.log('✅ Subscribe immediate notification working');

  // Test notification on change
  notified = false;
  store.setState({ zoomLevel: 2.5 });

  // Give a moment for async notification (if any)
  await new Promise(resolve => setTimeout(resolve, 10));

  const currentState = store.getState();
  if (currentState.zoomLevel === 2.5) {
    notified = true;
  }

  if (!notified) {
    throw new Error('UIStore notification on change failed');
  }
  console.log('✅ Notification on change working');

  // Test unsubscribe
  unsubscribe();
  store.setState({ zoomLevel: 3 });
  const finalState = store.getState();
  if (finalState.zoomLevel !== 3) {
    throw new Error('UIStore unsubscribe verification failed');
  }
  console.log('✅ Unsubscribe working');
}

async function runTests(): Promise<void> {
  try {
    await testDiagramStore();
    await testUIStore();

    console.log('\n✅ All state management tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
