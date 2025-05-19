const { devices } = require('@playwright/test');

module.exports = {
  testDir: './tests',
  reporter: 'html',
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  workers: 1, // increase this number to run tests in parallel
};
