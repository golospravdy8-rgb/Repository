import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({
    PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY || 'MISSING',
    PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'MISSING',
    SERVER_KEY: process.env.PUSHER_KEY ? 'EXISTS' : 'MISSING',
    SERVER_SECRET: process.env.PUSHER_SECRET ? 'EXISTS' : 'MISSING',
  });
}
