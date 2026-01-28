#!/usr/bin/env node

/**
 * Reset Rate Limit Script
 * This script resets the rate limiting by calling the reset endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function resetRateLimit() {
  console.log('🔄 Resetting Rate Limit');
  console.log('=======================');
  
  try {
    // Call the reset endpoint
    const response = await axios.post(`${BASE_URL}/api/reset-rate-limit`);
    console.log('Reset response:', response.data);
    
    // Test a request after reset
    const testResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('\nTest request after reset:');
    console.log(`Status: ${testResponse.status}`);
    console.log(`Rate limit remaining: ${testResponse.headers['ratelimit-remaining']}`);
    console.log(`Rate limit limit: ${testResponse.headers['ratelimit-limit']}`);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

resetRateLimit();
