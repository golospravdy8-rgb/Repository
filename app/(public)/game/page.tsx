'use client';

import { useEffect } from 'react';

export default function GamePage() {
  useEffect(() => {
    // Redirect to the static HTML demo
    window.location.href = '/rucheyok-demo.html';
  }, []);

  return <div>Redirecting to game...</div>;
}
