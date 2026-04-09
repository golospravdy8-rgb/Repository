import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/blob/upload
 *
 * Server-side загальновження логотипу на Vercel Blob з явною передачею токена.
 * Це найбільш надійний метод для користувацькиме перенесення (2026 best practice).
 *
 * Body (FormData):
 *   - file: File (обов'язково)
 *   - filename: string (необов'язково, використовується як префікс)
 *
 * Response:
 *   - success: boolean
 *   - url: string (публічний URL на blob.vercel-storage.com)
 *   - pathname: string (внутрішній шлях у Blob Store)
 *   - error?: string (при помилці)
 *
 * ВАЖЛИВО: Токен LOGOS_READ_WRITE_TOKEN читається явно з process.env на сервері,
 * не покладаючись на @vercel/blob автоматичну детекцію.
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  console.log(`[Blob Upload ${requestId}] Request started`);
  console.log(`[Blob Upload ${requestId}] URL: ${request.url}`);
  console.log(`[Blob Upload ${requestId}] Method: ${request.method}`);
  console.log(`[Blob Upload ${requestId}] Content-Type: ${request.headers.get('content-type')}`);

  try {
    // КРИТИЧНО: Явно читаємо токен з process.env (не покладаємось на автоматичну детекцію)
    // Це вирішує проблему "No token found" при кастомних префіксах (LOGOS_READ_WRITE_TOKEN)
    const token = process.env.LOGOS_READ_WRITE_TOKEN;

    console.log(`[Blob Upload ${requestId}] Checking token...`);
    if (!token) {
      console.error(`[Blob Upload ${requestId}] ❌ CRITICAL: LOGOS_READ_WRITE_TOKEN не знайдено!`);
      console.error(`[Blob Upload ${requestId}] Додай LOGOS_READ_WRITE_TOKEN у Vercel Environment Variables`);
      console.error(`[Blob Upload ${requestId}] Поточне оточення:`, {
        NODE_ENV: process.env.NODE_ENV,
        hasAnyBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
        hasLogosToken: !!token,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'LOGOS_READ_WRITE_TOKEN не встановлено на сервері. Перевір Vercel Environment Variables.',
          details: process.env.NODE_ENV === 'development' ? {
            NODE_ENV: process.env.NODE_ENV,
            tokenFound: !!token,
          } : undefined,
        },
        { status: 500 }
      );
    }

    console.log(`[Blob Upload ${requestId}] ✅ Token found, proceeding...`);

    // Парсимо FormData
    console.log(`[Blob Upload ${requestId}] Parsing FormData...`);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const filename = (formData.get('filename') as string) || `team-logo-${Date.now()}`;

    // ДІАГНОСТИКА: Лог вхідних даних
    console.log(`[Blob Upload ${requestId}] File received:`, {
      exists: !!file,
      name: file?.name,
      type: file?.type,
      size: file?.size,
      filename_prefix: filename,
    });

    if (!file) {
      console.warn(`[Blob Upload ${requestId}] ❌ File не знайдено у FormData`);
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    // Валідація типу файлу
    if (!file.type.startsWith('image/')) {
      console.warn(`[Blob Upload ${requestId}] ❌ Невалідний тип файлу: ${file.type}`);
      return NextResponse.json(
        { success: false, error: `Only image files are allowed (received: ${file.type})` },
        { status: 400 }
      );
    }

    // Валідація розміру (макс 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      console.warn(`[Blob Upload ${requestId}] ❌ Файл занадто великий: ${file.size} bytes`);
      return NextResponse.json(
        { success: false, error: `File is too large (max ${MAX_SIZE / 1024 / 1024}MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    // Конвертуємо файл у буфер
    console.log(`[Blob Upload ${requestId}] Converting file to buffer...`);
    const buffer = await file.arrayBuffer();
    console.log(`[Blob Upload ${requestId}] Buffer size: ${buffer.byteLength} bytes`);

    // Генеруємо унікальну назву файлу
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueFilename = `logos/${filename}-${Date.now()}.${fileExtension}`;
    console.log(`[Blob Upload ${requestId}] Generated filename: ${uniqueFilename}`);

    // Завантажуємо на Vercel Blob з ЯВНОЮ передачею токена (BEST PRACTICE 2026)
    console.log(`[Blob Upload ${requestId}] Uploading to Vercel Blob with explicit token...`);
    let blob;
    try {
      // НАЙВАЖЛИВІШЕ: Передаємо токен явно через options
      // Це гарантує, що @vercel/blob використовуватиме наш кастомний LOGOS_READ_WRITE_TOKEN
      blob = await put(uniqueFilename, buffer, {
        access: 'public',
        contentType: file.type,
        token: token, // ← ЯВНА ПЕРЕДАЧА ТОКЕНА (вирішує "No token found" проблему)
      });
      console.log(`[Blob Upload ${requestId}] ✅ Upload success!`);
    } catch (blobError) {
      const blobErrorMsg = blobError instanceof Error ? blobError.message : String(blobError);
      console.error(`[Blob Upload ${requestId}] ❌ Vercel Blob error: ${blobErrorMsg}`);

      // ДІАГНОСТИКА: Додаткова інформація про помилку
      if (blobErrorMsg.includes('401') || blobErrorMsg.includes('403') || blobErrorMsg.includes('Unauthorized')) {
        console.error(`[Blob Upload ${requestId}] ⚠️  Помилка автентифікації! Токен може бути неправильним або просрочено.`);
        console.error(`[Blob Upload ${requestId}] Перевір: https://vercel.com/dashboard → Storage → Blob → View Token`);
      }
      if (blobErrorMsg.includes('ENOTFOUND') || blobErrorMsg.includes('ECONNREFUSED')) {
        console.error(`[Blob Upload ${requestId}] ⚠️  Помилка мережі! Перевір з'єднання з vercel-storage.com`);
      }

      throw blobError;
    }

    console.log(`[Blob Upload ${requestId}] ✅ Success details:`, {
      url: blob.url,
      pathname: blob.pathname,
      size: buffer.byteLength,
      duration: `${Date.now() - startTime}ms`,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.error(`[Blob Upload ${requestId}] ❌ ERROR:`, {
      message: errorMessage,
      stack: errorStack,
      duration: `${Date.now() - startTime}ms`,
    });

    // Різні типи помилок з детальною діагностикою
    let userFriendlyError = errorMessage;
    let statusCode = 500;

    if (errorMessage.includes('No token found') || errorMessage.includes('Unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
      userFriendlyError = 'Помилка автентифікації. Перевір LOGOS_READ_WRITE_TOKEN у Vercel Environment Variables.';
      statusCode = 401;
    } else if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
      userFriendlyError = 'Помилка мережі. Перевір з\'єднання з Vercel Blob (vercel-storage.com).';
    } else if (errorMessage.includes('Invalid token')) {
      userFriendlyError = 'Токен недійсний або просрочено. Оновіть LOGOS_READ_WRITE_TOKEN у Vercel Dashboard.';
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyError,
        debug: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          hasToken: !!process.env.LOGOS_READ_WRITE_TOKEN,
        } : undefined,
      },
      { status: statusCode }
    );
  }
}

/**
 * OPTIONS /api/blob/upload
 *
 * CORS preflight response
 * Браузер відправляє OPTIONS перш ніж POST для перевірки дозволів
 */
export async function OPTIONS(request: NextRequest) {
  console.log(`[Blob Upload CORS] OPTIONS request from: ${request.headers.get('origin')}`);

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/blob/upload
 *
 * Health check endpoint — перевіряє чи токен налаштований на сервері
 */
export async function GET(request: NextRequest) {
  console.log(`[Blob Upload] GET health check`);

  // Явна перевірка наявності токена
  const hasToken = !!process.env.LOGOS_READ_WRITE_TOKEN;
  const tokenPrefix = hasToken ? process.env.LOGOS_READ_WRITE_TOKEN?.substring(0, 20) + '...' : 'NOT FOUND';

  return NextResponse.json({
    message: 'Blob upload API - Ready',
    endpoint: 'POST /api/blob/upload',
    health: {
      logos_token_configured: hasToken,
      token_prefix: process.env.NODE_ENV === 'development' ? tokenPrefix : 'hidden',
      node_env: process.env.NODE_ENV,
      runtime: 'nodejs',
      timestamp: new Date().toISOString(),
    },
    required_fields: ['file'],
    optional_fields: ['filename'],
  });
}
