#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting database migration...');
console.log('📁 Running migration script...');

// Run the migration script
const migrationProcess = spawn('node', ['migration.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

migrationProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Migration completed successfully!');
    console.log('🔄 Database is now synchronized between mobile and website');
  } else {
    console.error('❌ Migration failed with code:', code);
  }
});

migrationProcess.on('error', (error) => {
  console.error('❌ Error running migration:', error);
});
