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
 * Особливості:
 * - Direct client upload на Vercel Blob
 * - Instant preview перед завантаженням
 * - Progress bar
 * - Fallback на абревіатуру команди
 * - Оптимізовані зображення через Next.js Image
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Обробник клацання на квадрат логотипу
   */
  const handleClickLogo = () => {
    fileInputRef.current?.click();
  };

  /**
   * Обробник вибору файлу
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валідація на клієнті
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Виберіть зображення (JPG, PNG, WebP тощо)';
      onError?.(errorMsg);
      alert(errorMsg);
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      const errorMsg = 'Файл занадто великий (макс 5MB)';
      onError?.(errorMsg);
      alert(errorMsg);
      return;
    }

    // Миттєвий preview (локальний blob URL)
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);
    setProgress(0);

    try {
      // Готуємо FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', `team-logo-${Date.now()}`);

      // Завантажуємо на Vercel Blob
      const response = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });

      // Симулюємо progress (реальний progress через XMLHttpRequest був би складніше)
      setProgress(50);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Upload failed (${response.status})`);
      }

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error('No URL returned from upload');
      }

      // Успішне завантаження
      setProgress(100);
      setLogoUrl(data.url);

      // Очищуємо локальний preview
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);

      // Повідомляємо батьківський компонент
      onLogoUploadSuccess(data.url);

      console.log('[TeamLogoUploader] Upload success:', {
        url: data.url,
        filename: data.pathname,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload error';
      console.error('[TeamLogoUploader] Error:', errorMsg);

      onError?.(errorMsg);
      alert(`❌ Помилка завантаження: ${errorMsg}`);

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
    }
  };

  /**
   * Видалити поточний логотип
   */
  const handleDeleteLogo = () => {
    setLogoUrl('');
    setPreviewUrl(null);
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
    </div>
  );
}
