import { defineConfig, devices } from '@playwright/test';

const serverCommand =
    'php artisan migrate:fresh --env=e2e --force --seed --seeder=EndToEndSeeder && ' +
    'php artisan serve --env=e2e --no-reload --host=127.0.0.1 --port=8011';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: process.env.CI
        ? [['github'], ['html', { open: 'never' }]]
        : 'list',
    use: {
        baseURL: 'http://127.0.0.1:8011',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: serverCommand,
        url: 'http://127.0.0.1:8011/up',
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
