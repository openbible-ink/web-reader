import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectAccessible(page: Page) {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

    expect(results.violations).toEqual([]);
}

async function signIn(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email').fill('accessibility@example.test');
    await page.getByLabel('Password', { exact: true }).fill('password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
}

test('public reader passes an automated accessibility scan', async ({ page }) => {
    await page.goto('/read/JHN/1');
    await expect(page.getByText('In the beginning the Word was')).toBeVisible();
    await expectAccessible(page);
});

test('authentication pages pass automated accessibility scans', async ({ page }) => {
    await page.goto('/login');
    await expectAccessible(page);

    await page.goto('/register');
    await expectAccessible(page);
});

test('authenticated dashboard passes an automated accessibility scan', async ({ page }) => {
    await signIn(page);
    await expectAccessible(page);
});

test('reader panels close with Escape and restore focus', async ({ page }) => {
    await page.goto('/read/JHN/1');
    const appearance = page.getByRole('button', { name: 'Typography settings' });
    await appearance.focus();
    await appearance.press('Enter');
    await expect(page.getByText('Reading appearance')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Reading appearance')).toBeHidden();
    await expect(appearance).toBeFocused();
});
