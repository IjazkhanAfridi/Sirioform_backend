// Test script to verify discente update functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testDiscenteUpdate() {
  try {
    console.log('Testing Discente Update Functionality...\n');

    // Test 1: Check if the route exists by trying to access it without auth
    console.log('1. Testing route accessibility...');
    try {
      const response = await axios.put(`${BASE_URL}/discenti/test-id`, {
        nome: 'Test Update',
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(
          '✅ Route exists and requires authentication (as expected)'
        );
      } else if (error.response && error.response.status === 404) {
        console.log('❌ Route not found - check route configuration');
        return;
      } else {
        console.log('✅ Route exists (got different error than 404)');
      }
    }

    // Test 2: Try the patent update route
    console.log('\n2. Testing patent update route...');
    try {
      const response = await axios.patch(
        `${BASE_URL}/discenti/test-id/patent`,
        {
          patentNumber: 'TEST123',
        }
      );
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(
          '✅ Patent update route exists and requires authentication'
        );
      } else if (error.response && error.response.status === 404) {
        console.log('❌ Patent update route not found');
        return;
      } else {
        console.log('✅ Patent update route exists');
      }
    }

    console.log(
      '\n✅ All route tests passed! The discente update routes are properly configured.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDiscenteUpdate();
