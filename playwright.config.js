const { devices } = require('@playwright/test');

module.exports = {
  testDir: './tests',
  retries: 1,
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    trace: 'on',
    screenshot: 'on', // 👈 Capture screenshot on test failure
    video: 'on', // 👈 Record video of the test run
    slowMo: 500, // Slow down by 500ms to observe actions
  },
  reporter: [['html', { title: 'Neura E2E Automation Report',  open: 'always' }]],
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
