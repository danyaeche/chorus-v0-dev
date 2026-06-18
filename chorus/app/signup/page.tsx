import Link from 'next/link';
import { Workflow } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="grid w-full max-w-3xl overflow-hidden rounded-xl border shadow-sm md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-foreground p-8 text-background md:flex">
          <div className="flex items-center gap-2">
            <Workflow className="size-5" />
            <span className="font-semibold">chorus</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Create your account</h2>
            <p className="mt-2 text-sm opacity-70">Get started with Chorus.</p>
          </div>
        </div>

        <div className="p-8">
          <h1 className="text-lg font-semibold">Create your workspace</h1>
          <form className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input placeholder="Mathieu Kury" />
            </div>
            <div className="space-y-1.5">
              <Label>Work email</Label>
              <Input type="email" placeholder="mkury@also.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input placeholder="ALSO" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <Link href="/dashboard" className={buttonVariants({ className: 'w-full' })}>
              Create account
            </Link>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
