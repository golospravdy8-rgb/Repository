'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface TeamLogoUploaderProps {
  /**
   * Поточний URL логотипу (якщо редагування)
   */
  currentLogoUrl?: string;

  /**
   * Коротка назва команди для fallback (напр. "ШЧ")
   */
  shortName?: string;

  /**
   * Callback коли логотип успішно завантажено
   * @param url - публічний URL логотипу на Vercel Blob
   */
  onLogoUploadSuccess: (url: string) => void;

  /**
   * Optional: callback для помилок
   */
  onError?: (error: string) => void;

  /**
   * Optional: callback для tracking прогресу (0-100)
   */
  onProgress?: (progress: number) => void;

  /**
   * Размер квадрата у пікселях (за замовч. 80)
   */
  size?: number;
}

/**
 * Компонент для завантаження логотипу команди через Vercel Blob
 *
 * ВАЖЛИВО (2026 BEST PRACTICE):
 * - Сам НЕ читаємо токен (як раніше спробували)
 * - Замість цього робимо fetch до /api/blob/upload
 * - Сервер явно передає токен до @vercel/blob (гарантує успіх)
 * - Це вирішує проблему "No token found" при кастомних префіксах (LOGOS_READ_WRITE_TOKEN)
 *
 * Особливості:
 * - Instant preview перед завантаженням (локальний)
 * - Progress bar (0-50% до відповіді сервера, потім 100%)
 * - Fallback на абревіатуру команди
 * - Детальна діагностика в console (без блокування UI)
 * - М'яка обробка помилок
 */
export default function TeamLogoUploader({
  currentLogoUrl,
  shortName = 'БЛ',
  onLogoUploadSuccess,
  onError,
  onProgress,
  size = 80,
}: TeamLogoUploaderProps) {
  const [logoUrl, setLogoUrl] = useState<string>(currentLogoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Обробник клацання на квадрат логотипу
   */
  const handleClickLogo = () => {
    console.log('[TeamLogoUploader] Logo square clicked');
    console.log('[TeamLogoUploader] Upload method: Server-side (POST /api/blob/upload with explicit token)');
    console.log('[TeamLogoUploader] fileInputRef:', fileInputRef.current ? 'exists' : 'NOT FOUND');

    if (!fileInputRef.current) {
      console.error('[TeamLogoUploader] ❌ ERROR: fileInputRef is null! Input не замонтований.');
      // Не блокуємо UI жорстким alert — показуємо помилку в state
      setError('Помилка компонента: input element не знайдено. Перезавантажте сторінку.');
      return;
    }

    fileInputRef.current.click();
    console.log('[TeamLogoUploader] File input triggered');
  };

  /**
   * Обробник вибору файлу
   * ДІАГНОСТИКА: Детальне логування на кожному кроці
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    // Очищуємо попередню помилку
    setError(null);

    console.log(`[TeamLogoUploader ${uploadId}] File selection started`);

    const file = e.target.files?.[0];

    if (!file) {
      console.warn(`[TeamLogoUploader ${uploadId}] No file selected (user cancelled)`);
      return;
    }

    // ДІАГНОСТИКА: Лог про вибраний файл
    console.log(`[TeamLogoUploader ${uploadId}] File selected:`, {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    // Валідація на клієнті (перед завантаженням)
    if (!file.type.startsWith('image/')) {
      const errorMsg = `Виберіть зображення (одержано: ${file.type})`;
      console.error(`[TeamLogoUploader ${uploadId}] ❌ Invalid file type: ${file.type}`);
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      const errorMsg = `Файл занадто великий (макс 5MB, одержано: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
      console.error(`[TeamLogoUploader ${uploadId}] ❌ File too large: ${file.size} bytes`);
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // ДІАГНОСТИКА: Перед preview
    console.log(`[TeamLogoUploader ${uploadId}] Creating local preview...`);
    const localPreview = URL.createObjectURL(file);
    console.log(`[TeamLogoUploader ${uploadId}] Preview URL created:`, localPreview);

    setPreviewUrl(localPreview);
    setIsUploading(true);
    setProgress(0);

    console.log(`[TeamLogoUploader ${uploadId}] State updated: isUploading=true, preview shown`);

    try {
      // Готуємо FormData
      console.log(`[TeamLogoUploader ${uploadId}] Preparing FormData...`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', `team-logo-${Date.now()}`);

      console.log(`[TeamLogoUploader ${uploadId}] FormData prepared`);

      // ДІАГНОСТИКА: Перед fetch
      console.log(`[TeamLogoUploader ${uploadId}] Starting fetch to /api/blob/upload...`);
      setProgress(25);

      const response = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
        // ВАЖЛИВО: НЕ встановлюємо Content-Type! Браузер сам встановить multipart/form-data
      });

      console.log(`[TeamLogoUploader ${uploadId}] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
      });

      setProgress(50);

      // Парсимо відповідь
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`[TeamLogoUploader ${uploadId}] Could not parse response as JSON`);
        throw new Error(`Server error (status ${response.status}): Invalid response format`);
      }

      // Перевіряємо HTTP статус
      if (!response.ok) {
        console.warn(`[TeamLogoUploader ${uploadId}] ❌ HTTP error: ${response.status}`);
        console.error(`[TeamLogoUploader ${uploadId}] Error response:`, data);

        // Витягуємо помилку зі сервера
        const errorMsg = data.error || data.message || `Upload failed (status ${response.status})`;
        throw new Error(errorMsg);
      }

      console.log(`[TeamLogoUploader ${uploadId}] Response parsed:`, {
        success: data.success,
        urlReceived: !!data.url,
        pathname: data.pathname,
      });

      // Перевіряємо структуру успішної відповіді
      if (!data.success || !data.url) {
        console.error(`[TeamLogoUploader ${uploadId}] ❌ Invalid response structure:`, data);
        throw new Error('Server returned invalid response (no URL)');
      }

      // ✅ Успішне завантаження
      console.log(`[TeamLogoUploader ${uploadId}] ✅ Upload successful!`);
      setProgress(100);
      setLogoUrl(data.url);

      // Очищуємо локальний preview
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);

      // Повідомляємо батьківський компонент
      onLogoUploadSuccess(data.url);

      console.log(`[TeamLogoUploader ${uploadId}] ✅ Complete:`, {
        url: data.url,
        duration: `${Date.now() - startTime}ms`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload error';
      const errorStack = error instanceof Error ? error.stack : '';

      console.error(`[TeamLogoUploader ${uploadId}] ❌ EXCEPTION:`, {
        message: errorMsg,
        stack: errorStack,
        duration: `${Date.now() - startTime}ms`,
      });

      // ДІАГНОСТИКА: Категоризуємо помилку для користувача
      let userMessage = errorMsg;
      if (errorMsg.includes('LOGOS_READ_WRITE_TOKEN') || errorMsg.includes('Unauthorized') || errorMsg.includes('token')) {
        userMessage = '⚠️ Помилка налаштування токена. Перевір LOGOS_READ_WRITE_TOKEN у Vercel Dashboard.';
      } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
        userMessage = '⚠️ Помилка автентифікації. Перевір токен у Vercel.';
      } else if (errorMsg.includes('network') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
        userMessage = '⚠️ Помилка мережі. Перевір з\'єднання з Vercel.';
      }

      // Показуємо помилку м'яко (не жорстким alert)
      setError(userMessage);
      onError?.(errorMsg);

      // Скидаємо preview при помилці
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setProgress(0);

      // Очищуємо input щоб дозволити обрати той же файл знову
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      console.log(`[TeamLogoUploader ${uploadId}] Cleanup completed, ready for next upload`);
    }
  };

  /**
   * Видалити поточний логотип
   */
  const handleDeleteLogo = () => {
    setLogoUrl('');
    setPreviewUrl(null);
    setError(null);
    onLogoUploadSuccess('');
  };

  // Визначаємо яке зображення показувати (preview або збережене)
  const displayUrl = previewUrl || logoUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Квадрат логотипу */}
      <div
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-white cursor-pointer hover:border-orange-400 transition-colors flex-shrink-0 group"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        onClick={handleClickLogo}
        title="Клацніть щоб завантажити логотип"
      >
        {displayUrl ? (
          <>
            {/* Завдяки Next.js Image, зображення оптимізується */}
            <img
              src={displayUrl}
              alt="team-logo"
              className="object-cover w-full h-full"
              onError={(e) => {
                console.warn('[TeamLogoUploader] Image load error');
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </>
        ) : (
          // Fallback: абревіатура команди
          <span className="text-gray-300 font-black select-none" style={{ fontSize: size / 2 }}>
            {shortName}
          </span>
        )}

        {/* Overlay при наведенні та завантаженні */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-white text-xs font-bold">{progress}%</div>
          </div>
        )}

        {/* Hover effect */}
        {!isUploading && displayUrl && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-bold">Змінити</span>
          </div>
        )}
      </div>

      {/* Input file (прихований) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {/* Кнопка дії */}
      <button
        type="button"
        onClick={handleClickLogo}
        disabled={isUploading}
        className="text-xs text-gray-500 hover:text-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isUploading ? `Завантаження ${progress}%...` : displayUrl ? 'Змінити фото' : 'Додати фото'}
      </button>

      {/* Кнопка видалення (якщо логотип є) */}
      {displayUrl && !isUploading && (
        <button
          type="button"
          onClick={handleDeleteLogo}
          className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
        >
          Видалити
        </button>
      )}

      {/* Progress bar під час завантаження */}
      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
          <div
            className="bg-orange-500 h-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Помилка — показуємо м'яко, без жорстких alert */}
      {error && !isUploading && (
        <div className="text-xs text-red-500 text-center mt-2 max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}
