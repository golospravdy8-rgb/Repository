'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function LeadersAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Poll every 30 seconds during LIVE games (real-time leaderboard updates)
    const interval = setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => clearInterval(interval);
  }, [router]);

  // No visual output — only polling logic
  return null;
}
