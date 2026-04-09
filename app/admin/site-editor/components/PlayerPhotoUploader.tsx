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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClickPhoto = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валідація
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Виберіть зображення';
      onError?.(errorMsg);
      alert(errorMsg);
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const errorMsg = 'Файл занадто великий (макс 5MB)';
      onError?.(errorMsg);
      alert(errorMsg);
      return;
    }

    // Миттєвий preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', `player-photo-${Date.now()}`);

      // Завантажуємо
      const response = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(50);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Upload failed (${response.status})`);
      }

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error('No URL returned');
      }

      setProgress(100);
      setPhotoUrl(data.url);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);

      onPhotoUploadSuccess(data.url);

      console.log('[PlayerPhotoUploader] Upload success:', data.url);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload error';
      console.error('[PlayerPhotoUploader] Error:', errorMsg);
      onError?.(errorMsg);
      alert(`❌ Помилка: ${errorMsg}`);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = () => {
    setPhotoUrl('');
    setPreviewUrl(null);
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
    </div>
  );
}
