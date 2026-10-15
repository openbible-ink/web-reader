import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

type Props = {
    artwork: string;
    artworkAlt: string;
    children: ReactNode;
    alternateLabel: string;
    alternateAction: string;
    alternateHref: string;
    panelClassName?: string;
};

export default function EditorialAuthShell({
    artwork,
    artworkAlt,
    children,
    alternateLabel,
    alternateAction,
    alternateHref,
    panelClassName = '',
}: Props) {
    return (
        <main className="min-h-svh bg-[#e9e3da] p-0 text-[#171815] sm:p-4 lg:p-6">
            <div className="mx-auto grid min-h-svh max-w-[1220px] overflow-hidden bg-[#f8f4ed] shadow-[0_24px_80px_rgba(48,39,25,0.12)] sm:min-h-[calc(100svh-2rem)] sm:rounded-[24px] lg:grid-cols-[minmax(320px,0.95fr)_minmax(460px,1.05fr)]">
                <div className="relative min-h-52 overflow-hidden lg:min-h-full">
                    <img
                        src={artwork}
                        alt={artworkAlt}
                        className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171815]/10 via-transparent to-white/5" />
                </div>

                <section
                    className={`relative flex bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.9),transparent_34%),linear-gradient(135deg,#fbf8f2_0%,#f4eee5_100%)] ${panelClassName}`}
                >
                    <div className="mx-auto flex w-full max-w-[570px] flex-col px-7 py-8 sm:px-12 sm:py-10 lg:px-16 lg:py-14">
                        <div className="mb-10 flex items-start justify-between gap-6">
                            <Link
                                href="/"
                                aria-label="Open Bible home"
                                className="rounded-md focus-visible:ring-2 focus-visible:ring-[#9b6a28] focus-visible:ring-offset-4 focus-visible:outline-none"
                            >
                                <img
                                    src="/images/brand/open-bible-mark-dark-128.png"
                                    alt=""
                                    className="h-16 w-auto sm:h-[74px]"
                                />
                            </Link>

                            <p className="pt-1 text-right font-serif text-sm leading-6 text-[#777168]">
                                {alternateLabel}
                                <br />
                                <Link
                                    href={alternateHref}
                                    className="inline-flex items-center gap-1.5 text-[#4d4a44] underline decoration-[#8d877d] underline-offset-4 transition-colors hover:text-black focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#9b6a28] focus-visible:outline-none"
                                >
                                    {alternateAction}
                                    <ArrowRight
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                </Link>
                            </p>
                        </div>

                        {children}
                    </div>
                </section>
            </div>
        </main>
    );
}
