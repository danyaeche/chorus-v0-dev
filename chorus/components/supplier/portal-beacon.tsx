'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { markPortalOpenedAction } from '@/app/supplier/actions';

/**
 * Fires once when the supplier opens their magic link: stamps last-opened, moves
 * a freshly-invited DFM to "in review", and logs the access. Guarded per browser
 * session so it does not loop on refresh.
 */
export function PortalBeacon({ token }: { token: string }) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const key = `chorus-opened-${token}`;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    markPortalOpenedAction(token).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [token, router]);

  return null;
}
