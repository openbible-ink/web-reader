import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { pageLayout, withAppShell } from '@/app-shell';

const appName = process.env.VITE_APP_NAME || 'Open Bible';
const pages = import.meta.glob<{ default: ComponentType }>('./pages/**/*.tsx', {
    eager: true,
});

void createServer((page) =>
    createInertiaApp({
        page,
        render: renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        layout: pageLayout,
        resolve: (name) => pages[`./pages/${name}.tsx`].default,
        setup: ({ App, props }) => withAppShell(<App {...props} />),
    }),
);
