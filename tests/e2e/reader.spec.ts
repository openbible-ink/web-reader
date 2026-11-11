import { expect, test } from '@playwright/test';

test('reads scripture and navigates between chapters', async ({ page }) => {
    await page.goto('/read/JHN/1');

    await expect(
        page.getByRole('heading', { name: 'John', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('In the beginning the Word was')).toBeVisible();

    await page.getByRole('button', { name: 'Chapter outline' }).click();
    await expect(
        page.getByRole('heading', { name: 'Chapter outline' }),
    ).toBeVisible();
    await page.getByRole('button', { name: /The preparation/i }).click();
    await expect(page).toHaveURL(/\/read\/JHN\/1\?section=the-preparation/);

    await page.getByRole('button', { name: 'Next chapter' }).click();
    await expect(page).toHaveURL(/\/read\/JHN\/2/);
    await expect(
        page.getByText('Two days after this there was a wedding'),
    ).toBeVisible();
});

test('switches translation for the passage without changing its canonical route', async ({
    page,
}) => {
    await page.goto('/read/JHN/1');

    await page.getByRole('button', { name: /Translation OEB:/ }).click();
    await page.getByRole('button', { name: /World English Bible/i }).click();

    await expect(page).toHaveURL(/\/read\/JHN\/1\?translation=webp/);
    await expect(
        page.getByRole('button', { name: /Translation WEB:/ }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /\/read\/JHN\/1$/,
    );
});

test('compares two translations in verse-aligned reader rows', async ({
    page,
}) => {
    await page.goto('/read/JHN/1');

    await page.getByRole('button', { name: /Translation OEB:/ }).click();
    await page.getByRole('button', { name: 'WEB', exact: true }).click();

    await expect(page).toHaveURL(/\/read\/JHN\/1\?compare=webp/);
    await expect(page.getByLabel('Compared translations')).toContainText(
        'Open English Bible',
    );
    await expect(page.getByLabel('Compared translations')).toContainText(
        'World English Bible',
    );
    await expect(
        page.getByRole('button', {
            name: /WEB: Close World English Bible.*comparison/i,
        }),
    ).toBeVisible();
    await expect(page.locator('[data-verse-number="1"]')).toHaveCount(2);

    await page
        .getByRole('button', {
            name: /Swap translations: show World English Bible.*first/i,
        })
        .click();
    await expect(page).toHaveURL(/translation=webp/);
    await expect(page).toHaveURL(/compare=oeb/);
    await expect(
        page.getByRole('button', { name: /Translation WEB:/ }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Next chapter' }).click();
    await expect(page).toHaveURL(/\/read\/JHN\/2/);
    await expect(page).toHaveURL(/translation=webp/);
    await expect(page).toHaveURL(/compare=oeb/);
    await expect(page.locator('[data-verse-number="1"]')).toHaveCount(2);
});
