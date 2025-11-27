'use client';

import { useCopyProtection } from '@/hooks/useCopyProtection';

export function CopyProtectionProvider({ children }: { children: React.ReactNode }) {
  useCopyProtection();
  return <>{children}</>;
}