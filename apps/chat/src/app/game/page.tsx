'use client';

import { useEffect } from 'react';

export default function GamePage() {
  useEffect(() => {
    // Serve the static Socket.IO multiplayer game
    // The rucheyok-demo.html file contains the full game with Socket.IO integration
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    window.location.href = `${baseUrl}/rucheyok-demo.html`;
  }, []);

  return <div className="text-white p-4">Loading game...</div>;
}
