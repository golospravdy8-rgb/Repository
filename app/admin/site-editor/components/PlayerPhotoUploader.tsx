'use client';

import { useState, useRef } from 'react';

interface PlayerPhotoUploaderProps {
  /**
   * Поточне фото гравця (URL)
   */
  currentPhotoUrl?: string;

  /**
   * Callback коли фото успішно завантажено
   */
  onPhotoUploadSuccess: (url: string) => void;

  /**
   * Optional: callback для помилок
   */
  onError?: (error: string) => void;

  /**
   * Optional: callback для tracking прогресу
   */
  onProgress?: (progress: number) => void;
}

/**
 * Компонент для завантаження фото гравця через Vercel Blob
 * (Аналогічно TeamLogoUploader, але для кругового фото)
 *
 * ВАЖЛИВО (2026 BEST PRACTICE):
 * - Сервер явно передає LOGOS_READ_WRITE_TOKEN до @vercel/blob
 * - Це гарантує успіх при кастомних префіксах токена
 * - М'яка обробка помилок без жорстких alert'ів
 */
export default function PlayerPhotoUploader({
  currentPhotoUrl,
  onPhotoUploadSuccess,
  onError,
  onProgress,
}: PlayerPhotoUploaderProps) {
  const [photoUrl, setPhotoUrl] = useState<string>(currentPhotoUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClickPhoto = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    const file = e.target.files?.[0];
    if (!file) return;

    // Очищуємо попередню помилку
    setError(null);

    console.log(`[PlayerPhotoUploader ${uploadId}] File selected:`, {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    });

    // Валідація на клієнті
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Виберіть зображення';
      console.error(`[PlayerPhotoUploader ${uploadId}] ❌ Invalid file type: ${file.type}`);
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      const errorMsg = 'Файл занадто великий (макс 5MB)';
      console.error(`[PlayerPhotoUploader ${uploadId}] ❌ File too large: ${file.size} bytes`);
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Миттєвий preview
    console.log(`[PlayerPhotoUploader ${uploadId}] Creating preview...`);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);
    setProgress(0);

    try {
      console.log(`[PlayerPhotoUploader ${uploadId}] Starting upload to /api/blob/upload...`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', `player-photo-${Date.now()}`);

      const response = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(50);

      // Парсимо відповідь
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`[PlayerPhotoUploader ${uploadId}] Could not parse response as JSON`);
        throw new Error(`Server error (status ${response.status})`);
      }

      if (!response.ok) {
        console.warn(`[PlayerPhotoUploader ${uploadId}] ❌ HTTP error: ${response.status}`);
        console.error(`[PlayerPhotoUploader ${uploadId}] Error response:`, data);
        throw new Error(data.error || `Upload failed (${response.status})`);
      }

      if (!data.success || !data.url) {
        console.error(`[PlayerPhotoUploader ${uploadId}] ❌ Invalid response:`, data);
        throw new Error('No URL returned from server');
      }

      console.log(`[PlayerPhotoUploader ${uploadId}] ✅ Upload successful!`);
      setProgress(100);
      setPhotoUrl(data.url);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);

      onPhotoUploadSuccess(data.url);

      console.log(`[PlayerPhotoUploader ${uploadId}] ✅ Complete (${Date.now() - startTime}ms)`);
    } catch (errorObj) {
      const errorMsg = errorObj instanceof Error ? errorObj.message : 'Upload error';
      const errorStack = errorObj instanceof Error ? errorObj.stack : '';

      console.error(`[PlayerPhotoUploader ${uploadId}] ❌ EXCEPTION:`, {
        message: errorMsg,
        stack: errorStack,
        duration: `${Date.now() - startTime}ms`,
      });

      // М'яка обробка помилки
      let userMessage = errorMsg;
      if (errorMsg.includes('token') || errorMsg.includes('Unauthorized')) {
        userMessage = '⚠️ Помилка налаштування токена. Перевір LOGOS_READ_WRITE_TOKEN.';
      } else if (errorMsg.includes('network') || errorMsg.includes('ENOTFOUND')) {
        userMessage = '⚠️ Помилка мережі. Перевір з\'єднання з Vercel.';
      }

      setError(userMessage);
      onError?.(errorMsg);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.log(`[PlayerPhotoUploader ${uploadId}] Cleanup completed`);
    }
  };

  const handleDeletePhoto = () => {
    setPhotoUrl('');
    setPreviewUrl(null);
    setError(null);
    onPhotoUploadSuccess('');
  };

  const displayUrl = previewUrl || photoUrl;

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      {/* Фото гравця — круг */}
      <div
        className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-white cursor-pointer hover:border-orange-400 transition-colors relative group"
        onClick={handleClickPhoto}
        title="Клацніть щоб завантажити фото"
      >
        {isUploading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayUrl ? (
          <img src={displayUrl} alt="player-photo" className="object-cover w-full h-full" />
        ) : (
          <span className="text-gray-300 text-2xl">👤</span>
        )}

        {/* Hover effect */}
        {!isUploading && displayUrl && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            <span className="text-white text-xs font-bold">Змінити</span>
          </div>
        )}
      </div>

      {/* Hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {/* Action button */}
      <button
        type="button"
        onClick={handleClickPhoto}
        disabled={isUploading}
        className="text-xs text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50 whitespace-nowrap font-medium"
      >
        {isUploading ? `${progress}%` : displayUrl ? 'Змінити' : 'Додати фото'}
      </button>

      {/* Delete button */}
      {displayUrl && !isUploading && (
        <button
          type="button"
          onClick={handleDeletePhoto}
          className="text-xs text-red-400 hover:text-red-600 font-medium"
        >
          Видалити
        </button>
      )}

      {/* Помилка — показуємо м'яко, без жорстких alert */}
      {error && !isUploading && (
        <div className="text-xs text-red-500 text-center mt-1 max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}
