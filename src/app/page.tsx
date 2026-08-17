'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const Studio = dynamic(() => import('@/components/Studio'), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <LoaderCircle className="spin" /> Loading SEA ACADEMY…
    </div>
  ),
});

export default function Home() {
  return <Studio />;
}
