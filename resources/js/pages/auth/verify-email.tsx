import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

export default function VerifyEmail() {
    return (
        <>
            <Head title="Email verification" />

            <div className="space-y-6 text-center">
                <p className="text-sm text-muted-foreground">
                    Email verification is currently disabled for testing.
                </p>
                <Button asChild>
                    <Link href="/dashboard">Continue to dashboard</Link>
                </Button>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description: 'Email verification is currently disabled for testing.',
};
