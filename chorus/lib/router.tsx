import * as React from 'react';
import {
  Link as TanStackLink,
  useNavigate,
  useRouter as useTanStackRouter,
  useRouterState,
} from '@tanstack/react-router';

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children?: React.ReactNode;
};

export function Link({ href, children, ...props }: LinkProps) {
  return (
    <TanStackLink to={href} {...props}>
      {children}
    </TanStackLink>
  );
}

export function usePathname() {
  return useRouterState({ select: (state) => state.location.pathname });
}

export function useRouter() {
  const navigate = useNavigate();
  const router = useTanStackRouter();
  return {
    push: (href: string) => navigate({ to: href }),
    replace: (href: string) => navigate({ to: href, replace: true }),
    back: () => window.history.back(),
    refresh: () => router.invalidate(),
  };
}

export function notFound(): never {
  throw new Error('NOT_FOUND');
}

export function redirect(path: string): never {
  throw new RedirectError(path);
}

export class RedirectError extends Error {
  constructor(public path: string) {
    super(`REDIRECT:${path}`);
  }
}
