'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RecepcionistasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?view=recepcionistas');
  }, [router]);

  return null;
}
