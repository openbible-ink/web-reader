import { Form, Head } from '@inertiajs/react';
import {
    ArrowRight,
    Bookmark,
    Compass,
    Mail,
    SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import EditorialAuthShell from '@/components/auth/editorial-auth-shell';
import SocialAuthButtons from '@/components/auth/social-auth-buttons';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

const fieldClassName =
    'h-12 rounded-xl border-[#d4ccc0] bg-white/38 px-4 font-serif text-[15px] shadow-none placeholder:text-[#9b958c] focus-visible:border-[#95682d] focus-visible:ring-[#b37b32]/20';

const benefits = [
    {
        icon: Bookmark,
        title: 'Save your place',
        description: 'Pick up where you left off, on any device.',
    },
    {
        icon: SlidersHorizontal,
        title: 'Make it yours',
        description: 'Choose your reading experience.',
    },
    {
        icon: Compass,
        title: 'Explore more',
        description: 'Discover related passages and resources.',
    },
];

export default function Register({ passwordRules }: Props) {
    const [showEmailForm, setShowEmailForm] = useState(false);

    return (
        <>
            <Head title="Create your account" />

            <EditorialAuthShell
                artwork="/images/auth/register-botanical.webp"
                artworkAlt="A vintage botanical study of olive branches"
                alternateLabel="Already have an account?"
                alternateAction="Sign in"
                alternateHref={login().url}
            >
                <div className="my-auto">
                    <header className="mb-8">
                        <h1 className="max-w-[420px] font-serif text-[clamp(2.75rem,5vw,4.15rem)] leading-[0.95] tracking-[-0.05em] text-[#171815]">
                            Create your account
                        </h1>
                        <p className="mt-5 max-w-[420px] font-serif text-[17px] leading-7 text-[#716c64]">
                            A free account lets you save your place, explore
                            across devices, and make the Bible your own.
                        </p>
                    </header>

                    {!showEmailForm && (
                        <div className="grid gap-3">
                            <SocialAuthButtons />
                            <button
                                type="button"
                                onClick={() => setShowEmailForm(true)}
                                className="relative flex h-13 w-full items-center justify-center rounded-xl border border-[#d3cbc0] bg-white/45 px-5 font-serif text-[15px] text-[#24231f] transition hover:border-[#a99c8b] hover:bg-white/75 focus-visible:ring-2 focus-visible:ring-[#9b6a28] focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                                <span className="absolute left-5 flex size-7 items-center justify-center">
                                    <Mail
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                Sign up with email
                            </button>
                        </div>
                    )}

                    {showEmailForm && (
                        <Form
                            {...store.form()}
                            resetOnSuccess={[
                                'password',
                                'password_confirmation',
                            ]}
                            disableWhileProcessing
                            className="grid gap-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="username"
                                            className="text-[11px] font-semibold tracking-[0.2em] uppercase"
                                        >
                                            Username
                                        </Label>
                                        <Input
                                            id="username"
                                            type="text"
                                            required
                                            autoFocus
                                            autoComplete="username"
                                            name="username"
                                            placeholder="Choose a username"
                                            className={fieldClassName}
                                        />
                                        <InputError message={errors.username} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="email"
                                            className="text-[11px] font-semibold tracking-[0.2em] uppercase"
                                        >
                                            Email
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            name="email"
                                            placeholder="you@example.com"
                                            className={fieldClassName}
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="password"
                                                className="text-[11px] font-semibold tracking-[0.2em] uppercase"
                                            >
                                                Password
                                            </Label>
                                            <PasswordInput
                                                id="password"
                                                required
                                                autoComplete="new-password"
                                                name="password"
                                                placeholder="Password"
                                                passwordrules={passwordRules}
                                                className={fieldClassName}
                                            />
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="password_confirmation"
                                                className="text-[11px] font-semibold tracking-[0.2em] uppercase"
                                            >
                                                Confirm
                                            </Label>
                                            <PasswordInput
                                                id="password_confirmation"
                                                required
                                                autoComplete="new-password"
                                                name="password_confirmation"
                                                placeholder="Repeat password"
                                                passwordrules={passwordRules}
                                                className={fieldClassName}
                                            />
                                            <InputError
                                                message={
                                                    errors.password_confirmation
                                                }
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        data-test="register-user-button"
                                        className="mt-1 flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#1d1e1a] px-6 font-serif text-base text-[#fffaf1] transition hover:bg-black focus-visible:ring-2 focus-visible:ring-[#9b6a28] focus-visible:ring-offset-3 focus-visible:outline-none disabled:cursor-wait disabled:opacity-65"
                                    >
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            'Create account'
                                        )}
                                        {!processing && (
                                            <ArrowRight
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailForm(false)}
                                        className="mx-auto rounded-sm text-sm text-[#666159] underline decoration-[#9d968b] underline-offset-4 hover:text-black focus-visible:ring-2 focus-visible:ring-[#9b6a28] focus-visible:outline-none"
                                    >
                                        Back to all sign-up options
                                    </button>
                                </>
                            )}
                        </Form>
                    )}

                    {!showEmailForm && (
                        <>
                            <div className="my-7 flex items-center gap-4 text-[10px] font-semibold tracking-[0.22em] text-[#817b72] uppercase">
                                <span className="h-px flex-1 bg-[#d8d0c5]" />
                                Benefits
                                <span className="h-px flex-1 bg-[#d8d0c5]" />
                            </div>
                            <ul className="grid gap-5">
                                {benefits.map(
                                    ({ icon: Icon, title, description }) => (
                                        <li
                                            key={title}
                                            className="flex items-center gap-4"
                                        >
                                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eee6d9] text-[#876c3d]">
                                                <Icon
                                                    aria-hidden="true"
                                                    className="size-5 stroke-[1.5]"
                                                />
                                            </span>
                                            <div className="font-serif">
                                                <h2 className="text-[15px] text-[#292824]">
                                                    {title}
                                                </h2>
                                                <p className="mt-0.5 text-[13px] leading-5 text-[#898278]">
                                                    {description}
                                                </p>
                                            </div>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </>
                    )}

                    <p className="mt-8 font-serif text-xs leading-5 text-[#827b72]">
                        By creating an account you agree to our{' '}
                        <a
                            href="/terms"
                            className="underline underline-offset-4 hover:text-black"
                        >
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a
                            href="/privacy"
                            className="underline underline-offset-4 hover:text-black"
                        >
                            Privacy Policy
                        </a>
                        .
                    </p>
                </div>
            </EditorialAuthShell>
        </>
    );
}
