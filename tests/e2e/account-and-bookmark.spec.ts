import { expect, test } from '@playwright/test';

test('registers, bookmarks a passage, and sees it on the dashboard', async ({
    page,
}) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Sign up with email' }).click();
    await page.getByLabel('Username').fill('e2e_reader');
    await page.getByLabel('Email').fill('e2e@example.test');
    await page.getByLabel('Password', { exact: true }).fill('password');
    await page.getByLabel('Confirm').fill('password');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
        page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.goto('/login');
    await page.getByLabel('Email').fill('e2e@example.test');
    await page.getByLabel('Password', { exact: true }).fill('password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/read/JHN/1');
    await page.getByRole('button', { name: 'Save a passage' }).click();
    await page.getByLabel(/Title/).fill('The Word and the Light');
    await page.getByRole('button', { name: 'Save bookmark' }).click();
    await expect(
        page.getByRole('button', { name: '1 bookmarks in this chapter' }),
    ).toBeVisible();

    await page.goto('/dashboard?saved=bookmarks');
    await expect(
        page.getByRole('tab', { name: 'Bookmarks (1)' }),
    ).toBeVisible();
    await expect(page.getByText('The Word and the Light')).toBeVisible();
});
