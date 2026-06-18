import Link from 'next/link';
import { Workflow } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isSupabaseConfigured } from '@/lib/env';

export default function LoginPage() {
  const connected = isSupabaseConfigured();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="grid w-full max-w-3xl overflow-hidden rounded-xl border shadow-sm md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-foreground p-8 text-background md:flex">
          <div className="flex items-center gap-2">
            <Workflow className="size-5" />
            <span className="font-semibold">chorus</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="mt-2 text-sm opacity-70">
              DFM as a workflow — multi-provider Design-for-Manufacturability between a brand and the manufacturers it
              sources from.
            </p>
          </div>
        </div>

        <div className="p-8">
          <h1 className="text-lg font-semibold">Log in to your workspace</h1>
          <form className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="mkury@also.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Link href="/dashboard" className={buttonVariants({ className: 'w-full' })}>
              Log in
            </Link>
          </form>
          {!connected ? (
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Demo mode — Supabase isn&apos;t configured, so login is bypassed.{' '}
              <Link href="/dashboard" className="font-medium underline">
                Continue to the demo workspace
              </Link>
              .
            </p>
          ) : null}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
