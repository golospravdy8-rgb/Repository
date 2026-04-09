import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/blob/upload
 *
 * Клієнтське завантаження через Vercel Blob
 * Користувач обирає файл → клієнт отримує signed URL → завантажує напряму у Blob
 *
 * Body (FormData):
 *   - file: File
 *   - filename: string (opcional)
 *
 * Response:
 *   - success: boolean
 *   - url: string (публічний URL логотипу)
 *   - error?: string
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = (formData.get('filename') as string) || `team-logo-${Date.now()}`;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    // Перевірка типу файлу
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Перевірка розміру (макс 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File is too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Отримуємо буфер файлу
    const buffer = await file.arrayBuffer();

    // Генеруємо унікальну назву файлу
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueFilename = `logos/${filename}-${Date.now()}.${fileExtension}`;

    // Завантажуємо у Vercel Blob з public access
    const blob = await put(uniqueFilename, buffer, {
      access: 'public',
      contentType: file.type,
    });

    console.log('[Blob Upload] Success:', {
      filename: blob.pathname,
      url: blob.url,
      size: file.size,
    });

    return NextResponse.json(
      {
        success: true,
        url: blob.url,
        pathname: blob.pathname,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Blob Upload] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `Upload failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/blob/upload
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    message: 'Blob upload API',
    endpoint: 'POST /api/blob/upload',
    required_fields: ['file'],
    optional_fields: ['filename'],
  });
}
