/**
 * Integration and End-to-End tests
 * Run with: npx tsx src/server/__tests__/test-integration-e2e.ts
 *
 * Prerequisites: Backend server must be running on port 3000
 * Start server: npm run dev:server
 */

const INTEGRATION_API_BASE_URL = 'http://localhost:3000';

interface IntegrationTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const integrationResults: IntegrationTestResult[] = [];

async function runIntegrationTest(name: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn();
    integrationResults.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    integrationResults.push({ name, passed: false, error: errorMessage });
    console.error(`❌ ${name}: ${errorMessage}`);
  }
}

async function fetchJSONForIntegration(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
}

async function testImportExportFlow(): Promise<void> {
  console.log('\n🧪 Testing Import/Export Flow...');

  // Step 1: Create diagram via API
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
      {
        id: 'table-2',
        name: 'Posts',
        position: { x: 400, y: 100 },
        columns: [
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
            constraints: [],
          },
          {
            id: 'col-5',
            name: 'title',
            type: 'VARCHAR(255)',
            constraints: [{ type: 'NOT_NULL' }],
          },
        ],
      },
    ],
    relationships: [
      {
        id: 'rel-1',
        fromTableId: 'table-2',
        fromColumnId: 'col-4',
        toTableId: 'table-1',
        toColumnId: 'col-1',
        type: 'ONE_TO_MANY',
        optional: false,
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  await runIntegrationTest('Create diagram for import/export flow', async () => {
    const response = (await fetchJSON(`${INTEGRATION_API_BASE_URL}/api/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagramData),
    })) as { id: string };

    if (!response.id) {
      throw new Error('Diagram ID not returned');
    }
  });

  // Step 2: Get diagram
  let diagramId: string;
  await runIntegrationTest('Get created diagram', async () => {
    const createResponse = (await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagramData),
      }
    )) as { id: string };
    diagramId = createResponse.id;

    const getResponse = await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams/${diagramId}`
    );
    if (!getResponse || typeof getResponse !== 'object') {
      throw new Error('Invalid diagram response');
    }
  });

  // Step 3: Export to JSON
  await runIntegrationTest('Export diagram to JSON', async () => {
    const createResponse = (await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagramData),
      }
    )) as { id: string };
    const testDiagramId = createResponse.id;

    const exportResponse = await fetch(`${INTEGRATION_API_BASE_URL}/api/export?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testDiagramId,
        ...diagramData,
      }),
    });

    if (!exportResponse.ok) {
      throw new Error(`Export failed: ${exportResponse.status}`);
    }
    const exportData = await exportResponse.text();
    if (!exportData || exportData.length === 0) {
      throw new Error('Empty export data');
    }
  });

  // Step 4: Export to SQL
  await runIntegrationTest('Export diagram to SQL', async () => {
    const createResponse = (await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagramData),
      }
    )) as { id: string };
    const testDiagramId = createResponse.id;

    const exportResponse = await fetch(`${INTEGRATION_API_BASE_URL}/api/export?format=sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testDiagramId,
        ...diagramData,
      }),
    });

    if (!exportResponse.ok) {
      throw new Error(`Export failed: ${exportResponse.status}`);
    }
    const exportData = await exportResponse.text();
    if (!exportData || !exportData.includes('CREATE TABLE')) {
      throw new Error('Invalid SQL export');
    }
  });

  // Step 5: Export to SVG
  await runIntegrationTest('Export diagram to SVG', async () => {
    const createResponse = (await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagramData),
      }
    )) as { id: string };
    const testDiagramId = createResponse.id;

    const exportResponse = await fetch(`${INTEGRATION_API_BASE_URL}/api/export?format=svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testDiagramId,
        ...diagramData,
      }),
    });

    if (!exportResponse.ok) {
      throw new Error(`Export failed: ${exportResponse.status}`);
    }
    const exportData = await exportResponse.text();
    if (!exportData || !exportData.includes('<svg')) {
      throw new Error('Invalid SVG export');
    }
  });
}

async function testEndToEndFlow(): Promise<void> {
  console.log('\n🧪 Testing End-to-End Flow...');

  // Complete workflow: Create → Read → Update → Export → Delete
  await runIntegrationTest('Complete E2E workflow', async () => {
    // 1. Create
    const createResponse = (await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: [
            {
              id: 'table-1',
              name: 'TestTable',
              position: { x: 100, y: 100 },
              columns: [
                {
                  id: 'col-1',
                  name: 'id',
                  type: 'INTEGER',
                  constraints: [{ type: 'PRIMARY_KEY' }],
                },
              ],
            },
          ],
          relationships: [],
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      }
    )) as { id: string };

    const diagramId = createResponse.id;

    // 2. Read
    const readResponse = await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams/${diagramId}`
    );
    if (!readResponse || typeof readResponse !== 'object') {
      throw new Error('Read failed');
    }

    // 3. Update
    const updateResponse = await fetchJSONForIntegration(
      `${INTEGRATION_API_BASE_URL}/api/diagrams/${diagramId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: diagramId,
          tables: [
            {
              id: 'table-1',
              name: 'UpdatedTable',
              position: { x: 200, y: 200 },
              columns: [
                {
                  id: 'col-1',
                  name: 'id',
                  type: 'INTEGER',
                  constraints: [{ type: 'PRIMARY_KEY' }],
                },
              ],
            },
          ],
          relationships: [],
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      }
    );

    // 4. Export
    const exportResponse = await fetch(`${INTEGRATION_API_BASE_URL}/api/export?format=json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateResponse),
    });
    if (!exportResponse.ok) {
      throw new Error('Export failed');
    }

    // 5. Delete
    const deleteResponse = await fetch(`${INTEGRATION_API_BASE_URL}/api/diagrams/${diagramId}`, {
      method: 'DELETE',
    });
    if (deleteResponse.status !== 204) {
      throw new Error('Delete failed');
    }

    // 6. Verify deletion
    const verifyResponse = await fetch(`${INTEGRATION_API_BASE_URL}/api/diagrams/${diagramId}`);
    if (verifyResponse.status !== 404) {
      throw new Error('Diagram should be deleted');
    }
  });
}

async function testAPIErrorHandling(): Promise<void> {
  console.log('\n🧪 Testing API Error Handling...');

  await runIntegrationTest('404 for non-existent diagram', async () => {
    const response = await fetch(`${INTEGRATION_API_BASE_URL}/api/diagrams/non-existent-id`);
    if (response.status !== 404) {
      throw new Error('Should return 404 for non-existent diagram');
    }
  });

  await runIntegrationTest('400 for invalid diagram data', async () => {
    const response = await fetch(`${INTEGRATION_API_BASE_URL}/api/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tables: [],
        relationships: [],
        metadata: {},
      }),
    });
    if (response.status === 201) {
      throw new Error('Should reject invalid diagram data');
    }
  });

  await runIntegrationTest('400 for invalid export format', async () => {
    const response = await fetch(`${INTEGRATION_API_BASE_URL}/api/export?format=invalid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test',
        tables: [],
        relationships: [],
        metadata: {},
      }),
    });
    if (response.status === 200) {
      throw new Error('Should reject invalid export format');
    }
  });
}

async function runIntegrationTests(): Promise<void> {
  console.log('🧪 Running Integration and E2E Tests...\n');
  console.log('⚠️  Make sure backend server is running: npm run dev:server\n');

  try {
    await testImportExportFlow();
    await testEndToEndFlow();
    await testAPIErrorHandling();

    console.log('\n📊 Test Results Summary:');
    const passed = integrationResults.filter(r => r.passed).length;
    const failed = integrationResults.filter(r => !r.passed).length;
    console.log(`✅ Passed: ${passed}`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
      integrationResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.name}: ${r.error}`);
        });
    }

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

runIntegrationTests();
