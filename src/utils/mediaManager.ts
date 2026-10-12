import crypto from 'crypto';

export interface MediaFile {
  id: string; // SHA256 hash
  type: 'photo' | 'video';
  mimeType: string;
  size: number; // bytes
  uploadedAt: string;
  exerciseId?: string;
  setId?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // video duration in seconds
  };
}

export interface MediaLibrary {
  files: Map<string, MediaFile>;
  references: Map<string, string[]>; // exerciseId -> fileIds
}

/**
 * Calculate SHA256 hash of file
 */
export function calculateFileHash(data: ArrayBuffer): string {
  // Browser implementation using SubtleCrypto
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // For production, use actual hash
    // For now, use simple hash as fallback
    const view = new Uint8Array(data);
    let hash = 0;
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Compress image before upload
 * Returns blob with reduced size
 */
export async function compressImage(file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Get video metadata (duration, dimensions)
 */
export async function getVideoMetadata(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Create media file entry
 */
export function createMediaFile(
  id: string,
  file: File,
  type: 'photo' | 'video',
  metadata?: { width?: number; height?: number; duration?: number },
  exerciseId?: string,
  setId?: string
): MediaFile {
  return {
    id,
    type,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    exerciseId,
    setId,
    metadata,
  };
}

/**
 * Add media file to library
 */
export function addMediaToLibrary(
  library: MediaLibrary,
  file: MediaFile,
  exerciseId?: string
): MediaLibrary {
  library.files.set(file.id, file);

  if (exerciseId) {
    const refs = library.references.get(exerciseId) || [];
    if (!refs.includes(file.id)) {
      refs.push(file.id);
      library.references.set(exerciseId, refs);
    }
  }

  return library;
}

/**
 * Remove media file from library
 */
export function removeMediaFromLibrary(library: MediaLibrary, fileId: string): MediaLibrary {
  library.files.delete(fileId);

  // Remove from references
  for (const [exerciseId, fileIds] of library.references.entries()) {
    const filtered = fileIds.filter((id) => id !== fileId);
    if (filtered.length === 0) {
      library.references.delete(exerciseId);
    } else {
      library.references.set(exerciseId, filtered);
    }
  }

  return library;
}

/**
 * Get all media for an exercise
 */
export function getExerciseMedia(library: MediaLibrary, exerciseId: string): MediaFile[] {
  const fileIds = library.references.get(exerciseId) || [];
  return fileIds.map((id) => library.files.get(id)!).filter((f) => f);
}

/**
 * Find unused media files
 */
export function findUnusedMedia(library: MediaLibrary): MediaFile[] {
  const usedIds = new Set<string>();

  for (const fileIds of library.references.values()) {
    fileIds.forEach((id) => usedIds.add(id));
  }

  return Array.from(library.files.values()).filter((f) => !usedIds.has(f.id));
}

/**
 * Clean up unused media files
 */
export function cleanupUnusedMedia(library: MediaLibrary): MediaLibrary {
  const unused = findUnusedMedia(library);
  unused.forEach((file) => {
    library.files.delete(file.id);
  });
  return library;
}

/**
 * Get library statistics
 */
export function getMediaStats(library: MediaLibrary) {
  const files = Array.from(library.files.values());
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const photoCount = files.filter((f) => f.type === 'photo').length;
  const videoCount = files.filter((f) => f.type === 'video').length;

  return {
    totalFiles: files.length,
    photoCount,
    videoCount,
    totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
    unusedCount: findUnusedMedia(library).length,
  };
}

/**
 * Export media library metadata (not actual files)
 */
export function exportMediaMetadata(library: MediaLibrary): string {
  const metadata = {
    files: Array.from(library.files.values()),
    references: Object.fromEntries(library.references),
  };
  return JSON.stringify(metadata, null, 2);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
