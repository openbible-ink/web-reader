import { createInertiaApp } from '@inertiajs/react';
import { initializeTheme } from '@/hooks/use-appearance';
import { pageLayout, withAppShell } from '@/app-shell';

const appName = import.meta.env.VITE_APP_NAME || 'Open Bible';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: pageLayout,
    strictMode: true,
    withApp: withAppShell,
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
