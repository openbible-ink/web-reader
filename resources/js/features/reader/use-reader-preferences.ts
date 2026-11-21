import { useCallback, useEffect, useState } from 'react';
import type { OebVariantOptions } from 'usfm-parser/oeb';
import type { TypographyPreferences } from './types';
import {
    readerPreferencesKey,
    savedReaderPreferences,
} from './use-reader-scripture';

const defaultTypography: TypographyPreferences = {
    fontSize: 'medium',
    lineSpacing: 'comfortable',
    theme: 'light',
};

const typographyPreferencesKey = 'bible-reader:typography';

function savedTypography(): TypographyPreferences {
    if (typeof window === 'undefined') return defaultTypography;

    try {
        const saved = window.localStorage.getItem(typographyPreferencesKey);

        return saved
            ? { ...defaultTypography, ...JSON.parse(saved) }
            : defaultTypography;
    } catch {
        return defaultTypography;
    }
}

export function useReaderPreferences(editionSlug: string) {
    const [preferences, setPreferences] = useState<OebVariantOptions>(() =>
        savedReaderPreferences(editionSlug),
    );
    const [typography, setTypography] =
        useState<TypographyPreferences>(savedTypography);

    useEffect(() => {
        window.localStorage.setItem(
            readerPreferencesKey(editionSlug),
            JSON.stringify(preferences),
        );
    }, [editionSlug, preferences]);

    useEffect(() => {
        window.localStorage.setItem(
            typographyPreferencesKey,
            JSON.stringify(typography),
        );
    }, [typography]);

    const updatePreference = useCallback(
        <Key extends keyof OebVariantOptions>(
            key: Key,
            value: OebVariantOptions[Key],
        ) => setPreferences((current) => ({ ...current, [key]: value })),
        [],
    );
    const updateTypography = useCallback(
        <Key extends keyof TypographyPreferences>(
            key: Key,
            value: TypographyPreferences[Key],
        ) => setTypography((current) => ({ ...current, [key]: value })),
        [],
    );

    return {
        preferences,
        typography,
        updatePreference,
        updateTypography,
    };
}
