'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PostsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      router.replace('/dashboard/album');
    }
  }, [router]);

  return null;
}
