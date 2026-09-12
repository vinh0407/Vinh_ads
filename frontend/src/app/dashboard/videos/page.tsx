'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AlbumPostPage from '../albumpost/page';

export default function VideosPage() {
  const router = useRouter();

  useEffect(() => {
    // Graceful redirect to new route
    if (typeof window !== 'undefined') {
      router.replace('/dashboard/albumpost');
    }
  }, [router]);

  return <AlbumPostPage />;
}
