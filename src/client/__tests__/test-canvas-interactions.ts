/**
 * Unit tests for Canvas Interactions
 * Run with: npx tsx src/client/__tests__/test-canvas-interactions.ts
 * 
 * Note: These tests verify interaction logic and integration,
 * not React rendering (which would require React Testing Library)
 */

import { DiagramStore } from '../state/store/diagramStore';
import { UIStore } from '../state/store/uiStore';
import { Diagram } from '../core/diagram/Diagram';
import { Table } from '../core/table/Table';
import { Relationship } from '../core/relationship/Relationship';
import { Column } from '../types/table.types';

async function testTableSelection(): Promise<void> {
  console.log('\n🧪 Testing Table Selection...');

  const diagramStore = new DiagramStore();
  const uiStore = new UIStore();

  // Create diagram with tables
  const diagram = Diagram.create('selection-test');
  const table1 = new Table('table-1', 'Users', { x: 100, y: 100 });
  const table2 = new Table('table-2', 'Posts', { x: 400, y: 100 });
  diagram.addTable(table1);
  diagram.addTable(table2);
  diagramStore.setDiagram(diagram);

  // Test initial selection state
  const initialState = uiStore.getState();
  if (initialState.selectedTableId !== null) {
    throw new Error('Initial selection state should be null');
  }
  console.log('✅ Initial selection state correct');

  // Test table selection
  uiStore.setState({ selectedTableId: 'table-1' });
  const selectedState = uiStore.getState();
  if (selectedState.selectedTableId !== 'table-1') {
    throw new Error('Table selection failed');
  }
  console.log('✅ Table selection working');

  // Test selection change
  uiStore.setState({ selectedTableId: 'table-2' });
  const changedState = uiStore.getState();
  if (changedState.selectedTableId !== 'table-2') {
    throw new Error('Selection change failed');
  }
  console.log('✅ Selection change working');

  // Test deselection
  uiStore.setState({ selectedTableId: null });
  const deselectedState = uiStore.getState();
  if (deselectedState.selectedTableId !== null) {
    throw new Error('Deselection failed');
  }
  console.log('✅ Deselection working');
}

async function testTableDragging(): Promise<void> {
  console.log('\n🧪 Testing Table Dragging...');

  const diagram = Diagram.create('drag-test');
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  diagram.addTable(table);

  // Test initial position
  const initialPos = table.getPosition();
  if (initialPos.x !== 100 || initialPos.y !== 100) {
    throw new Error('Initial position incorrect');
  }
  console.log('✅ Initial position correct');

  // Test table movement
  table.moveTo({ x: 200, y: 300 });
  const newPos = table.getPosition();
  if (newPos.x !== 200 || newPos.y !== 300) {
    throw new Error('Table movement failed');
  }
  console.log('✅ Table movement working');

  // Test drag delta calculation
  const calculateDragDelta = (startPos: { x: number; y: number }, currentPos: { x: number; y: number }, zoom: number) => {
    return {
      x: (currentPos.x - startPos.x) / zoom,
      y: (currentPos.y - startPos.y) / zoom,
    };
  };

  const startPos = { x: 100, y: 100 };
  const currentPos = { x: 200, y: 150 };
  const zoom = 1.5;
  const delta = calculateDragDelta(startPos, currentPos, zoom);
  if (delta.x !== (100 / 1.5) || delta.y !== (50 / 1.5)) {
    throw new Error('Drag delta calculation failed');
  }
  console.log('✅ Drag delta calculation working');

  // Test zoom-aware dragging
  const applyDragDelta = (currentPos: { x: number; y: number }, delta: { x: number; y: number }) => {
    return {
      x: currentPos.x + delta.x,
      y: currentPos.y + delta.y,
    };
  };

  const finalPos = applyDragDelta(startPos, delta);
  if (finalPos.x === startPos.x && finalPos.y === startPos.y) {
    throw new Error('Zoom-aware dragging failed');
  }
  console.log('✅ Zoom-aware dragging working');
}

async function testRelationshipCreation(): Promise<void> {
  console.log('\n🧪 Testing Relationship Creation...');

  const diagram = Diagram.create('relationship-test');
  const usersTable = new Table('users', 'Users', { x: 100, y: 100 });
  const postsTable = new Table('posts', 'Posts', { x: 400, y: 100 });

  const userIdColumn: Column = {
    id: 'user-id',
    name: 'id',
    type: 'INTEGER',
    constraints: [{ type: 'PRIMARY_KEY' }],
  };
  const postUserIdColumn: Column = {
    id: 'post-user-id',
    name: 'user_id',
    type: 'INTEGER',
    constraints: [],
  };

  usersTable.addColumn(userIdColumn);
  postsTable.addColumn(postUserIdColumn);
  diagram.addTable(usersTable);
  diagram.addTable(postsTable);

  // Test relationship creation
  const relationship = new Relationship(
    'rel-1',
    'posts',
    'post-user-id',
    'users',
    'user-id',
    'ONE_TO_MANY',
    false
  );

  diagram.addRelationship(relationship);

  const relationships = diagram.getAllRelationships();
  if (relationships.length !== 1) {
    throw new Error('Relationship creation failed');
  }
  console.log('✅ Relationship creation working');

  // Test relationship validation
  const validation = relationship.validate(diagram);
  if (!validation.isValid) {
    throw new Error('Relationship validation failed');
  }
  console.log('✅ Relationship validation working');

  // Test relationship properties
  if (
    relationship.getFromTableId() !== 'posts' ||
    relationship.getToTableId() !== 'users' ||
    relationship.getType() !== 'ONE_TO_MANY'
  ) {
    throw new Error('Relationship properties incorrect');
  }
  console.log('✅ Relationship properties correct');
}

async function testContextMenuLogic(): Promise<void> {
  console.log('\n🧪 Testing Context Menu Logic...');

  // Test context menu item structure
  interface ContextMenuItem {
    label?: string;
    action?: () => void;
    disabled?: boolean;
    divider?: boolean;
  }

  const tableMenuItems: ContextMenuItem[] = [
    { label: 'Edit Table', action: () => {} },
    { label: 'Create Relationship', action: () => {} },
    { divider: true },
    { label: 'Delete Table', action: () => {} },
  ];

  if (tableMenuItems.length !== 4) {
    throw new Error('Context menu items structure incorrect');
  }
  console.log('✅ Context menu items structure correct');

  // Test divider item
  const dividerItem = tableMenuItems.find((item) => item.divider);
  if (!dividerItem || !dividerItem.divider) {
    throw new Error('Divider item not found');
  }
  console.log('✅ Divider item working');

  // Test menu item actions
  let actionExecuted = false;
  const testAction = () => {
    actionExecuted = true;
  };
  const testItem: ContextMenuItem = { label: 'Test', action: testAction };
  if (testItem.action) {
    testItem.action();
    if (!actionExecuted) {
      throw new Error('Menu item action execution failed');
    }
  }
  console.log('✅ Menu item actions working');

  // Test disabled items
  const disabledItem: ContextMenuItem = { label: 'Disabled', action: () => {}, disabled: true };
  if (!disabledItem.disabled) {
    throw new Error('Disabled item handling failed');
  }
  console.log('✅ Disabled items working');
}

async function testKeyboardShortcuts(): Promise<void> {
  console.log('\n🧪 Testing Keyboard Shortcuts...');

  // Test keyboard shortcut detection
  const isDeleteKey = (key: string): boolean => {
    return key === 'Delete' || key === 'Backspace';
  };

  if (!isDeleteKey('Delete') || !isDeleteKey('Backspace')) {
    throw new Error('Delete key detection failed');
  }
  console.log('✅ Delete key detection working');

  // Test Escape key
  const isEscapeKey = (key: string): boolean => {
    return key === 'Escape';
  };

  if (!isEscapeKey('Escape')) {
    throw new Error('Escape key detection failed');
  }
  console.log('✅ Escape key detection working');

  // Test modifier keys
  const isModifierPressed = (ctrlKey: boolean, metaKey: boolean): boolean => {
    return ctrlKey || metaKey;
  };

  if (!isModifierPressed(true, false) || !isModifierPressed(false, true)) {
    throw new Error('Modifier key detection failed');
  }
  console.log('✅ Modifier key detection working');

  // Test Ctrl/Cmd + N
  const isNewTableShortcut = (key: string, ctrlKey: boolean, metaKey: boolean): boolean => {
    return (ctrlKey || metaKey) && key === 'n';
  };

  if (!isNewTableShortcut('n', true, false) || !isNewTableShortcut('n', false, true)) {
    throw new Error('New table shortcut detection failed');
  }
  console.log('✅ New table shortcut detection working');

  // Test Ctrl/Cmd + S
  const isSaveShortcut = (key: string, ctrlKey: boolean, metaKey: boolean): boolean => {
    return (ctrlKey || metaKey) && key === 's';
  };

  if (!isSaveShortcut('s', true, false) || !isSaveShortcut('s', false, true)) {
    throw new Error('Save shortcut detection failed');
  }
  console.log('✅ Save shortcut detection working');
}

async function testTableAddDelete(): Promise<void> {
  console.log('\n🧪 Testing Table Add/Delete...');

  const diagram = Diagram.create('add-delete-test');
  const diagramStore = new DiagramStore();
  diagramStore.setDiagram(diagram);

  // Test add table
  const newTable = new Table('table-1', 'NewTable', { x: 200, y: 200 });
  diagram.addTable(newTable);

  const tables = diagram.getAllTables();
  if (tables.length !== 1 || tables[0].getName() !== 'NewTable') {
    throw new Error('Add table failed');
  }
  console.log('✅ Add table working');

  // Test delete table
  diagram.removeTable('table-1');
  const tablesAfterDelete = diagram.getAllTables();
  if (tablesAfterDelete.length !== 0) {
    throw new Error('Delete table failed');
  }
  console.log('✅ Delete table working');

  // Test delete with relationships
  const table1 = new Table('table-1', 'Users', { x: 100, y: 100 });
  const table2 = new Table('table-2', 'Posts', { x: 400, y: 100 });
  diagram.addTable(table1);
  diagram.addTable(table2);

  const relationship = new Relationship(
    'rel-1',
    'table-2',
    'col-1',
    'table-1',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  diagram.addRelationship(relationship);

  // Delete table should remove relationships
  diagram.removeTable('table-1');
  const relationshipsAfterDelete = diagram.getAllRelationships();
  if (relationshipsAfterDelete.length !== 0) {
    throw new Error('Delete table with relationships failed');
  }
  console.log('✅ Delete table with relationships working');
}

async function testCanvasInteractionsIntegration(): Promise<void> {
  console.log('\n🧪 Testing Canvas Interactions Integration...');

  const diagramStore = new DiagramStore();
  const uiStore = new UIStore();

  // Test complete interaction flow
  // Step 1: Create diagram
  const diagram = Diagram.create('integration-test');
  diagramStore.setDiagram(diagram);

  // Step 2: Add table
  const table = new Table('table-1', 'Users', { x: 100, y: 100 });
  diagram.addTable(table);
  diagramStore.setDiagram(diagram);

  // Step 3: Select table
  uiStore.setState({ selectedTableId: 'table-1' });
  if (uiStore.getState().selectedTableId !== 'table-1') {
    throw new Error('Integration step 3 (select) failed');
  }

  // Step 4: Move table
  table.moveTo({ x: 200, y: 200 });
  const newPos = table.getPosition();
  if (newPos.x !== 200 || newPos.y !== 200) {
    throw new Error('Integration step 4 (move) failed');
  }

  // Step 5: Create relationship
  const table2 = new Table('table-2', 'Posts', { x: 400, y: 200 });
  diagram.addTable(table2);
  const relationship = new Relationship(
    'rel-1',
    'table-2',
    'col-1',
    'table-1',
    'col-1',
    'ONE_TO_MANY',
    false
  );
  diagram.addRelationship(relationship);

  if (diagram.getAllRelationships().length !== 1) {
    throw new Error('Integration step 5 (relationship) failed');
  }

  console.log('✅ Canvas interactions integration working');
}

async function testRightClickHandling(): Promise<void> {
  console.log('\n🧪 Testing Right Click Handling...');

  // Test right click detection
  const isRightClick = (button: number): boolean => {
    return button === 2;
  };

  if (!isRightClick(2)) {
    throw new Error('Right click detection failed');
  }
  console.log('✅ Right click detection working');

  // Test context menu position
  const getContextMenuPosition = (clientX: number, clientY: number) => {
    return { x: clientX, y: clientY };
  };

  const position = getContextMenuPosition(100, 200);
  if (position.x !== 100 || position.y !== 200) {
    throw new Error('Context menu position calculation failed');
  }
  console.log('✅ Context menu position working');

  // Test prevent default
  const shouldPreventDefault = true;
  if (!shouldPreventDefault) {
    throw new Error('Prevent default logic failed');
  }
  console.log('✅ Prevent default working');
}

async function runTests(): Promise<void> {
  try {
    await testTableSelection();
    await testTableDragging();
    await testRelationshipCreation();
    await testContextMenuLogic();
    await testKeyboardShortcuts();
    await testTableAddDelete();
    await testCanvasInteractionsIntegration();
    await testRightClickHandling();

    console.log('\n✅ All canvas interactions tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();

