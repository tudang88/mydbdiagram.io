/**
 * Test script for Backend API endpoints
 * Run with: npx tsx src/server/__tests__/test-backend-api.ts
 * 
 * Prerequisites: Backend server must be running on port 3000
 * Start server: npm run dev:server
 */

const API_BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: unknown;
}

const results: TestResult[] = [];

async function test(name: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage });
    console.error(`❌ ${name}: ${errorMessage}`);
  }
}

async function fetchJSON(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
}

async function runTests(): Promise<void> {
  console.log('🧪 Testing Backend API Endpoints...\n');
  console.log('⚠️  Make sure backend server is running: npm run dev:server\n');

  // Test 1: Health Check
  await test('Health Check Endpoint', async () => {
    const response = await fetchJSON(`${API_BASE_URL}/health`);
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response format');
    }
    const data = response as { status?: string };
    if (data.status !== 'ok') {
      throw new Error('Health check failed');
    }
  });

  // Test 2: Create Diagram
  let createdDiagramId: string | null = null;
  await test('Create Diagram (POST /api/diagrams)', async () => {
    const diagramData = {
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
    };

    const response = await fetchJSON(`${API_BASE_URL}/api/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagramData),
    });

    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response format');
    }
    const data = response as { id?: string };
    if (!data.id) {
      throw new Error('Diagram ID not returned');
    }
    createdDiagramId = data.id;
  });

  // Test 3: Get Diagram by ID
  await test('Get Diagram by ID (GET /api/diagrams/:id)', async () => {
    if (!createdDiagramId) {
      throw new Error('No diagram ID available from create test');
    }

    const response = await fetchJSON(`${API_BASE_URL}/api/diagrams/${createdDiagramId}`);
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response format');
    }
    const data = response as { id?: string; tables?: unknown[] };
    if (data.id !== createdDiagramId) {
      throw new Error('Returned diagram ID does not match');
    }
    if (!Array.isArray(data.tables) || data.tables.length === 0) {
      throw new Error('Diagram tables not found');
    }
  });

  // Test 4: List All Diagrams
  await test('List All Diagrams (GET /api/diagrams)', async () => {
    const response = await fetchJSON(`${API_BASE_URL}/api/diagrams`);
    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response format');
    }
    const data = response as { diagrams?: unknown[] };
    if (!Array.isArray(data.diagrams)) {
      throw new Error('Diagrams array not found');
    }
    if (data.diagrams.length === 0) {
      throw new Error('No diagrams found');
    }
  });

  // Test 5: Update Diagram
  await test('Update Diagram (PUT /api/diagrams/:id)', async () => {
    if (!createdDiagramId) {
      throw new Error('No diagram ID available from create test');
    }

    const updateData = {
      tables: [
        {
          id: 'table-1',
          name: 'Users_Updated',
          position: { x: 200, y: 200 },
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
            {
              id: 'col-3',
              name: 'email',
              type: 'VARCHAR(255)',
              constraints: [{ type: 'UNIQUE' }],
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

    const response = await fetchJSON(`${API_BASE_URL}/api/diagrams/${createdDiagramId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (typeof response !== 'object' || response === null) {
      throw new Error('Invalid response format');
    }
    const data = response as { tables?: Array<{ name?: string; columns?: unknown[] }> };
    if (!data.tables || data.tables.length === 0) {
      throw new Error('Updated diagram tables not found');
    }
    if (data.tables[0].name !== 'Users_Updated') {
      throw new Error('Table name not updated');
    }
    if (!data.tables[0].columns || data.tables[0].columns.length !== 3) {
      throw new Error('Column count mismatch after update');
    }
  });

  // Test 6: Delete Diagram
  await test('Delete Diagram (DELETE /api/diagrams/:id)', async () => {
    if (!createdDiagramId) {
      throw new Error('No diagram ID available from create test');
    }

    const response = await fetch(`${API_BASE_URL}/api/diagrams/${createdDiagramId}`, {
      method: 'DELETE',
    });

    if (response.status !== 204) {
      const errorText = await response.text();
      throw new Error(`Expected 204, got ${response.status}: ${errorText}`);
    }

    // Verify deletion by trying to get the diagram
    const getResponse = await fetch(`${API_BASE_URL}/api/diagrams/${createdDiagramId}`);
    if (getResponse.status !== 404) {
      throw new Error('Diagram should not exist after deletion');
    }
  });

  // Test 7: Error Handling - Invalid Diagram Data
  await test('Error Handling - Invalid Diagram Data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' }),
    });

    if (response.status !== 400) {
      const errorText = await response.text();
      throw new Error(`Expected 400, got ${response.status}: ${errorText}`);
    }

    const errorData = await response.json();
    if (typeof errorData !== 'object' || errorData === null) {
      throw new Error('Invalid error response format');
    }
    const data = errorData as { error?: string };
    if (data.error !== 'VALIDATION_ERROR') {
      throw new Error('Expected VALIDATION_ERROR');
    }
  });

  // Test 8: Error Handling - Not Found
  await test('Error Handling - Diagram Not Found', async () => {
    const response = await fetch(`${API_BASE_URL}/api/diagrams/non-existent-id`);
    if (response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Expected 404, got ${response.status}: ${errorText}`);
    }

    const errorData = await response.json();
    if (typeof errorData !== 'object' || errorData === null) {
      throw new Error('Invalid error response format');
    }
    const data = errorData as { error?: string };
    if (data.error !== 'NOT_FOUND') {
      throw new Error('Expected NOT_FOUND error');
    }
  });

  // Print summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`   Total: ${results.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

