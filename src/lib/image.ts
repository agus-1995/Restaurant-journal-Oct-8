export interface CompressOptions {
  /** Longest side in px. */
  maxSize?: number
  /** JPEG quality 0-1. */
  quality?: number
}

/** Downscales the image onto a canvas (honouring EXIF rotation). Browser-only. */
async function drawScaled(
  file: Blob,
  { maxSize = 1280 }: CompressOptions,
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context unavailable')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    bitmap.close()
  }
}

/**
 * Downscales a photo and re-encodes it as a JPEG data URL so it fits in localStorage.
 * Browser-only (needs canvas); it is exercised in the browser, not in jsdom unit tests.
 */
export async function compressImage(file: Blob, options: CompressOptions = {}): Promise<string> {
  const canvas = await drawScaled(file, options)
  return canvas.toDataURL('image/jpeg', options.quality ?? 0.72)
}

/** Same compression, but as a JPEG Blob ready to upload to Supabase Storage. */
export async function compressImageToBlob(
  file: Blob,
  options: CompressOptions = {},
): Promise<Blob> {
  const canvas = await drawScaled(file, options)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      'image/jpeg',
      options.quality ?? 0.72,
    )
  })
}
