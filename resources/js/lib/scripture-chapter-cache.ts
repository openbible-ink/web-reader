import type { BibleDocument } from 'usfm-parser';

export interface ScriptureChapterPayload {
    schema: 'open-bible-scripture-chapter';
    schemaVersion: '1.0.0';
    edition: string;
    book: string;
    chapter: string;
    document: BibleDocument;
}

const payloads = new Map<string, ScriptureChapterPayload>();
const requests = new Map<string, Promise<ScriptureChapterPayload>>();
const maximumCachedChapters = 48;

function remember(url: string, payload: ScriptureChapterPayload) {
    payloads.delete(url);
    payloads.set(url, payload);
    const oldest = payloads.keys().next().value;
    if (payloads.size > maximumCachedChapters && oldest) {
        payloads.delete(oldest);
    }
    return payload;
}

export function cachedScriptureChapter(
    url: string,
): ScriptureChapterPayload | undefined {
    const payload = payloads.get(url);
    return payload ? remember(url, payload) : undefined;
}

export function loadScriptureChapter(
    url: string,
): Promise<ScriptureChapterPayload> {
    const cached = cachedScriptureChapter(url);
    if (cached) return Promise.resolve(cached);
    const pending = requests.get(url);
    if (pending) return pending;

    const request = fetch(url, { headers: { Accept: 'application/json' } })
        .then(async (response) => {
            if (!response.ok) throw new Error('Scripture chapter unavailable');
            const payload = (await response.json()) as ScriptureChapterPayload;
            if (
                payload.schema !== 'open-bible-scripture-chapter' ||
                payload.schemaVersion !== '1.0.0'
            ) {
                throw new Error('Unsupported scripture chapter format');
            }
            return remember(url, payload);
        })
        .finally(() => requests.delete(url));
    requests.set(url, request);
    return request;
}
