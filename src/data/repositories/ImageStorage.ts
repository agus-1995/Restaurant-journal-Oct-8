export interface ImageStorage {
  /**
   * Stores an image and resolves the string to keep in `Entry.photos`
   * (a compressed data URL today, a Supabase Storage URL later).
   * Throws `invalid` if the file is not an image.
   */
  upload(file: Blob): Promise<string>
  /** Releases the stored image. Safe to call for URLs that need no cleanup. */
  remove(url: string): Promise<void>
}
