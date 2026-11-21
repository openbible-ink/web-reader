import type { ReactElement } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import QuickSearch from '@/components/quick-search';

export function pageLayout(name: string) {
    switch (true) {
        case name === 'welcome' ||
            name === 'reader' ||
            name === 'search' ||
            name === 'book-overview' ||
            name === 'books' ||
            name === 'dashboard' ||
            name === 'bookmarks' ||
            name === 'highlights' ||
            name === 'notes' ||
            name === 'note-show' ||
            name === 'auth/login' ||
            name === 'auth/register':
            return null;
        case name.startsWith('auth/'):
            return AuthLayout;
        case name.startsWith('settings/'):
            return [AppLayout, SettingsLayout];
        default:
            return AppLayout;
    }
}

export function withAppShell(app: ReactElement): ReactElement {
    return (
        <TooltipProvider delayDuration={0}>
            {app}
            <QuickSearch />
            <Toaster />
        </TooltipProvider>
    );
}
