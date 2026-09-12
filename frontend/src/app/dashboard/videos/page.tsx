'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AlbumPage from '../album/page';

export default function VideosPage() {
  const router = useRouter();

  useEffect(() => {
    // Graceful redirect to new route
    if (typeof window !== 'undefined') {
      router.replace('/dashboard/album');
    }
  }, [router]);

  return <AlbumPage />;
}
