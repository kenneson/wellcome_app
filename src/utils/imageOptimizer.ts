
interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Optimizes an image URL for Supabase Storage
 * Adds query parameters to resize and compress the image on the fly.
 * Note: Actual transformation only happens if the Supabase project has Image Transformations enabled (Pro plan).
 * On Free plan, it may serve the original image, which is a safe fallback.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined, 
  options: ImageOptimizationOptions = {}
): string | undefined {
  if (!url) return undefined;

  // Check if it's a Supabase Storage URL
  // We check if it contains supabase.co and storage/v1/object/public
  const isSupabaseStorage = url.includes('.supabase.co') && url.includes('/storage/v1/object/public/');

  if (isSupabaseStorage) {
    const { width, height, quality = 80, resize = 'cover' } = options;
    
    // Construct transformation parameters
    const params = [];
    
    if (width) params.push(`width=${Math.round(width)}`);
    if (height) params.push(`height=${Math.round(height)}`);
    
    // Quality 80 is a good balance
    params.push(`quality=${quality}`);
    params.push(`resize=${resize}`);
    
    // Prefer WebP for better compression
    params.push('format=webp');

    const queryString = params.join('&');
    const separator = url.includes('?') ? '&' : '?';
    
    return `${url}${separator}${queryString}`;
  }

  return url;
}
