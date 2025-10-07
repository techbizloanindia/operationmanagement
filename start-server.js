#!/usr/bin/env node

import { spawn } from 'child_process';

// Get port from environment variable or default to 3000
const port = process.env.PORT || 3000;

console.log(`Starting Next.js application on port ${port}`);

// Memory optimization flags for Node.js
const nodeOptions = [
  '--max-old-space-size=400',  // Limit heap to 400MB (leaving room for Render's 512MB limit)
  '--max-semi-space-size=16',  // Limit young generation
  '--optimize-for-size',       // Optimize for memory usage over speed
];

// Set NODE_OPTIONS if not already set
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = nodeOptions.join(' ');
}

// Start Next.js with the specified port and memory optimizations
const nextProcess = spawn('next', ['start', '-p', port, '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS
  }
});

nextProcess.on('error', (error) => {
  console.error('Failed to start Next.js application:', error);
  process.exit(1);
});

nextProcess.on('close', (code) => {
  console.log(`Next.js application exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  nextProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  nextProcess.kill('SIGINT');
});

// Memory usage monitoring
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`Memory usage: RSS=${Math.round(usage.rss / 1024 / 1024)}MB, Heap=${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }, 30000); // Log every 30 seconds
}