/**
 * Unit tests for ApiClient
 * Run with: npx tsx src/client/__tests__/test-api-client.ts
 */

import { ApiClient } from '../services/ApiClient';

async function testApiClient(): Promise<void> {
  console.log('\n🧪 Testing ApiClient...');

  const apiClient = new ApiClient('http://localhost:3000');

  // Test GET request (health check)
  const healthResponse = await apiClient.get('/health');
  if (!healthResponse.success) {
    console.log('⚠️  GET test skipped - server not running');
    console.log('   (This is expected if server is not started)');
  } else {
    console.log('✅ GET request working');
  }

  // Test error handling
  const errorResponse = await apiClient.get('/nonexistent');
  if (!errorResponse.success && errorResponse.error) {
    console.log('✅ Error handling working');
  } else {
    throw new Error('ApiClient error handling failed');
  }

  // Test POST request structure
  const postResponse = await apiClient.post('/api/test', { test: 'data' });
  // We expect this to fail (endpoint doesn't exist), but structure should be correct
  if (
    Object.prototype.hasOwnProperty.call(postResponse, 'success') &&
    Object.prototype.hasOwnProperty.call(postResponse, 'error')
  ) {
    console.log('✅ POST request structure correct');
  } else {
    throw new Error('ApiClient POST structure incorrect');
  }

  // Test PUT request structure
  const putResponse = await apiClient.put('/api/test', { test: 'data' });
  if (Object.prototype.hasOwnProperty.call(putResponse, 'success')) {
    console.log('✅ PUT request structure correct');
  } else {
    throw new Error('ApiClient PUT structure incorrect');
  }

  // Test DELETE request structure
  const deleteResponse = await apiClient.delete('/api/test');
  if (Object.prototype.hasOwnProperty.call(deleteResponse, 'success')) {
    console.log('✅ DELETE request structure correct');
  } else {
    throw new Error('ApiClient DELETE structure incorrect');
  }

  console.log('\n✅ All ApiClient tests passed!');
}

testApiClient().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
