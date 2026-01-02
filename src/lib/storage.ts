import { supabase } from './supabase';

/**
 * Upload a frame image (sketch or polished) to Supabase Storage
 * @param userId - Current user ID
 * @param boardId - Board ID
 * @param frameId - Frame ID
 * @param dataUrl - Base64 data URL of the image
 * @param type - Type of image (sketch or polished)
 * @returns Public URL of the uploaded image, or null if failed
 */
export async function uploadFrameImage(
  userId: string,
  boardId: string,
  frameId: string,
  dataUrl: string,
  type: 'sketch' | 'polished'
): Promise<string | null> {
  try {
    // Convert base64 data URL to blob
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob = new Blob([buffer], { type: 'image/png' });

    // Create unique file path
    const path = `${userId}/${boardId}/${frameId}_${type}_${Date.now()}.png`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('frames')
      .upload(path, blob, {
        contentType: 'image/png',
        upsert: true // Replace if exists
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    // Get public URL
    const { data } = supabase.storage.from('frames').getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}

/**
 * Delete a frame image from storage
 * @param url - Public URL of the image to delete
 */
export async function deleteFrameImage(url: string): Promise<void> {
  try {
    // Extract path from public URL
    const urlParts = url.split('/storage/v1/object/public/frames/');
    if (urlParts.length < 2) return;

    const path = urlParts[1];

    const { error } = await supabase.storage
      .from('frames')
      .remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
    }
  } catch (error) {
    console.error('Delete failed:', error);
  }
}
