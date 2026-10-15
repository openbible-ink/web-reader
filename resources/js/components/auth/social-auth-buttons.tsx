import { Apple } from 'lucide-react';

function GoogleMark() {
    return (
        <span
            aria-hidden="true"
            className="font-sans text-lg font-bold text-[#4285f4]"
        >
            G
        </span>
    );
}

export default function SocialAuthButtons() {
    return (
        <div className="grid gap-3" aria-label="Social sign in options">
            <button
                type="button"
                disabled
                title="Google sign in is coming soon"
                className="group relative flex h-13 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[#d8d0c5] bg-white/45 px-5 font-serif text-[15px] text-[#24231f] opacity-70"
            >
                <span className="absolute left-5 flex size-7 items-center justify-center">
                    <GoogleMark />
                </span>
                Continue with Google
                <span className="sr-only"> (coming soon)</span>
            </button>
            <button
                type="button"
                disabled
                title="Apple sign in is coming soon"
                className="group relative flex h-13 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[#d8d0c5] bg-white/45 px-5 font-serif text-[15px] text-[#24231f] opacity-70"
            >
                <span className="absolute left-5 flex size-7 items-center justify-center">
                    <Apple aria-hidden="true" className="size-5 fill-current" />
                </span>
                Continue with Apple
                <span className="sr-only"> (coming soon)</span>
            </button>
        </div>
    );
}
