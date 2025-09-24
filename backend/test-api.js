#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api';

const testEndpoint = async (name, url, options = {}) => {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    const response = await fetch(`${BASE_URL}${url}`, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name} - Success`);
      if (data.data) {
        if (Array.isArray(data.data)) {
          console.log(`   📊 Returned ${data.data.length} items`);
          if (data.data[0]) {
            console.log(`   📋 Sample: ${JSON.stringify(data.data[0], null, 2).substring(0, 200)}...`);
          }
        } else {
          console.log(`   📋 Data keys: ${Object.keys(data.data).join(', ')}`);
        }
      }
    } else {
      console.log(`❌ ${name} - Failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ ${name} - Network Error: ${error.message}`);
  }
};

const runTests = async () => {
  console.log('🚀 Starting API Tests...');
  
  // Test public endpoints (no auth required)
  await testEndpoint('Public Dashboard', '/dashboard/public/overview');
  await testEndpoint('Public Inventory', '/inventory/public/items');
  
  // Test authentication
  try {
    console.log('\n🔐 Testing Authentication...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@rajkamal.local',
        password: 'ChangeMe_123!'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginResponse.ok && loginData.token) {
      console.log('✅ Authentication - Success');
      const token = loginData.token;
      
      // Test protected endpoints
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      await testEndpoint('Protected Dashboard', '/dashboard/overview', { headers: authHeaders });
      await testEndpoint('Protected Inventory', '/inventory/items', { headers: authHeaders });
      await testEndpoint('Product Rankings', '/rankings/products', { headers: authHeaders });
      
    } else {
      console.log('❌ Authentication - Failed:', loginData.message);
    }
  } catch (error) {
    console.log('❌ Authentication - Network Error:', error.message);
  }
  
  console.log('\n🎯 API Tests Completed!');
  console.log('\n💡 If you see Hindi book data (गोदान, हरी घास के ये दिन, etc.), your database is working correctly!');
};

runTests().catch(console.error);