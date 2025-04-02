// src/renderer/test/setup.js
import { afterEach } from 'vitest'; // Removed expect import
import { cleanup } from '@testing-library/react';
// import matchers from '@testing-library/jest-dom/matchers'; // Removed direct import
import '@testing-library/jest-dom/vitest'; // Import this to automatically extend expect

// No need to call expect.extend manually when using the above import
// expect.extend(matchers);

// Run cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock Electron API for tests (optional but often needed)
// You might need to expand this mock based on what your components use
global.window.electronAPI = {
  loadData: async () => ({ checklist: null, history: [], dismissedAlerts: [] }),
  saveData: async () => ({ success: true }),
  listWikiPages: async () => ({ success: true, pages: [] }),
  readWikiPage: async () => ({ success: true, content: '' }),
  writeWikiPage: async () => ({ success: true }),
  deleteWikiPage: async () => ({ success: true }),
  showPromptDialog: async (options) => ({ success: true, value: options?.defaultValue || 'test-page' }),
  // Add other mocked functions as needed
}; // Add missing closing brace
