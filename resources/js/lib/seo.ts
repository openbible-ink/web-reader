export function serialiseStructuredData(value: unknown): string {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}
