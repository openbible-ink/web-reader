const sourceCache = new Map<string, string>();
const sourceRequests = new Map<string, Promise<string>>();
const maximumCachedBooks = 12;

function rememberSource(url: string, source: string): void {
    sourceCache.delete(url);
    sourceCache.set(url, source);

    const oldestUrl = sourceCache.keys().next().value;
    if (sourceCache.size > maximumCachedBooks && oldestUrl) {
        sourceCache.delete(oldestUrl);
    }
}

export function cachedScriptureSource(url: string): string | undefined {
    const source = sourceCache.get(url);
    if (source !== undefined) rememberSource(url, source);
    return source;
}

export function loadScriptureSource(url: string): Promise<string> {
    const cached = cachedScriptureSource(url);
    if (cached !== undefined) return Promise.resolve(cached);

    const pending = sourceRequests.get(url);
    if (pending) return pending;

    const request = fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(
                    `Unable to load Scripture (${response.status})`,
                );
            }

            return response.text();
        })
        .then((source) => {
            rememberSource(url, source);
            sourceRequests.delete(url);
            return source;
        })
        .catch((error: unknown) => {
            sourceRequests.delete(url);
            throw error;
        });

    sourceRequests.set(url, request);
    return request;
}
