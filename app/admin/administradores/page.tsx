'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdministradoresPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?view=administradores');
  }, [router]);

  return null;
}
