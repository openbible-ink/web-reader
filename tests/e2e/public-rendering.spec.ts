import { expect, test } from '@playwright/test';

test('reader scripture is present in the initial HTML response', async ({
    request,
}) => {
    const response = await request.get('/read/JHN/1');
    const html = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(html).toContain('In the beginning');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('https://schema.org');
    expect(html).toContain('rel="canonical"');
});

test('library is indexable in the initial HTML response', async ({
    request,
}) => {
    const response = await request.get('/books');
    const html = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(html).toContain('Move through the library one book at a time');
    expect(html).toContain('John');
    expect(html).toContain('CollectionPage');
    expect(html).not.toContain('noindex,nofollow');
});
