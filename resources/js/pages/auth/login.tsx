import { Form, Head } from '@inertiajs/react';
import { ArrowRight, Leaf } from 'lucide-react';
import PasskeyVerify from '@/components/passkey-verify';
import EditorialAuthShell from '@/components/auth/editorial-auth-shell';
import SocialAuthButtons from '@/components/auth/social-auth-buttons';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

const fieldClassName =
    'h-12 rounded-xl border-[#d4ccc0] bg-white/38 px-4 font-serif text-[15px] shadow-none placeholder:text-[#9b958c] focus-visible:border-[#95682d] focus-visible:ring-[#b37b32]/20';

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Welcome back" />

            <EditorialAuthShell
                artwork="/images/auth/login-landscape.webp"
                artworkAlt="A vintage mountain landscape reflected in a quiet lake"
                alternateLabel="New to Open Bible?"
                alternateAction="Create an account"
                alternateHref={register().url}
            >
                <div className="my-auto">
                    <header className="mb-7">
                        <h1 className="font-serif text-[clamp(2.7rem,5vw,4rem)] leading-[0.98] tracking-[-0.045em] text-[#171815]">
                            Welcome back
                        </h1>
                        <p className="mt-4 max-w-[380px] font-serif text-[17px] leading-7 text-[#716c64]">
                            Sign in to continue reading, access your notes, and
                            pick up where you left off.
                        </p>
                    </header>

                    {status && (
                        <div
                            role="status"
                            className="mb-5 rounded-xl border border-[#a9b69b] bg-[#edf2e9] px-4 py-3 text-sm text-[#425239]"
                        >
                            {status}
                        </div>
                    )}

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-[11px] font-semibold tracking-[0.22em] text-[#666159] uppercase"
                                    >
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        className={fieldClassName}
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-[11px] font-semibold tracking-[0.22em] text-[#666159] uppercase"
                                    >
                                        Password
                                    </Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        autoComplete="current-password"
                                        placeholder="Your password"
                                        className={fieldClassName}
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 font-serif text-sm text-[#4f4b45]">
                                    <div className="flex items-center gap-2.5">
                                        <Checkbox
                                            id="remember"
                                            name="remember"
                                            className="border-[#777168] data-[state=checked]:border-[#1c1d19] data-[state=checked]:bg-[#1c1d19]"
                                        />
                                        <Label
                                            htmlFor="remember"
                                            className="font-normal"
                                        >
                                            Keep me signed in
                                        </Label>
                                    </div>
                                    {canResetPassword && (
                                        <a
                                            href={request().url}
                                            className="underline decoration-[#8e887f] underline-offset-4 hover:text-black focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#9b6a28] focus-visible:outline-none"
                                        >
                                            Forgot password?
                                        </a>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    data-test="login-button"
                                    className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#1d1e1a] px-6 font-serif text-base text-[#fffaf1] shadow-[0_8px_24px_rgba(21,22,18,0.12)] transition hover:bg-black focus-visible:ring-2 focus-visible:ring-[#9b6a28] focus-visible:ring-offset-3 focus-visible:outline-none disabled:cursor-wait disabled:opacity-65"
                                >
                                    {processing ? <Spinner /> : 'Sign in'}
                                    {!processing && (
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                    )}
                                </button>
                            </>
                        )}
                    </Form>

                    <div className="my-6 flex items-center gap-4 text-[10px] font-semibold tracking-[0.22em] text-[#817b72] uppercase">
                        <span className="h-px flex-1 bg-[#d8d0c5]" />
                        Or
                        <span className="h-px flex-1 bg-[#d8d0c5]" />
                    </div>

                    <SocialAuthButtons />

                    <div className="mt-3 overflow-hidden rounded-xl [&_button]:border-[#d8d0c5] [&_button]:bg-transparent [&_button]:font-serif [&_button]:shadow-none [&>div:last-child]:hidden">
                        <PasskeyVerify />
                    </div>

                    <blockquote className="mt-7 flex items-center gap-4 rounded-2xl bg-[#eee5d8]/70 px-5 py-4 font-serif text-[#565149]">
                        <Leaf
                            aria-hidden="true"
                            className="size-9 shrink-0 stroke-[#806a47] stroke-[1.25]"
                        />
                        <div>
                            <p className="text-[15px] leading-5 italic">
                                “Your word is a lamp to my feet and a light to
                                my path.”
                            </p>
                            <cite className="mt-2 block text-[9px] font-semibold tracking-[0.24em] uppercase not-italic">
                                Psalm 119:105
                            </cite>
                        </div>
                    </blockquote>
                </div>
            </EditorialAuthShell>
        </>
    );
}
