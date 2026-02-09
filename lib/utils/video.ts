/**
 * Video utility functions
 * Supports YouTube, Vimeo, direct video URLs (MP4/WebM), and Supabase storage recordings
 */

export type VideoType = 'youtube' | 'vimeo' | 'upload' | 'embed' | 'external'

export type ResolvedVideo = {
  type: 'iframe' | 'video'
  url: string
  videoType: VideoType
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  url = url.trim();

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * Get YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: "default" | "medium" | "high" | "maxres" = "high"): string {
  const qualityMap = {
    default: "default",
    medium: "mqdefault",
    high: "hqdefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Extract Vimeo video ID from URL
 */
export function extractVimeoVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:vimeo\.com\/)(\d+)/,
    /(?:player\.vimeo\.com\/video\/)(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Get Vimeo embed URL from video ID
 */
export function getVimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}`;
}

/**
 * Detect video type from URL
 */
export function detectVideoType(url: string): VideoType {
  if (!url) return 'external';
  const lower = url.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.includes('supabase') && lower.includes('storage')) return 'upload';
  if (lower.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return 'upload';
  if (lower.includes('embed') || lower.includes('iframe')) return 'embed';
  return 'external';
}

/**
 * Resolve a video URL into a playable source.
 * Returns the type of player needed (iframe or HTML5 video) and the final URL.
 */
export function resolveVideoSource(videoUrl: string, videoType?: string | null): ResolvedVideo | null {
  if (!videoUrl) return null;

  const type = (videoType as VideoType) || detectVideoType(videoUrl);

  switch (type) {
    case 'youtube': {
      const id = extractYouTubeVideoId(videoUrl);
      if (!id) return null;
      return { type: 'iframe', url: getYouTubeEmbedUrl(id), videoType: 'youtube' };
    }
    case 'vimeo': {
      const id = extractVimeoVideoId(videoUrl);
      if (!id) return null;
      return { type: 'iframe', url: getVimeoEmbedUrl(id), videoType: 'vimeo' };
    }
    case 'upload':
      return { type: 'video', url: videoUrl, videoType: 'upload' };
    case 'embed':
      return { type: 'iframe', url: videoUrl, videoType: 'embed' };
    case 'external':
      // Treat external URLs that look like video files as direct video
      if (videoUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
        return { type: 'video', url: videoUrl, videoType: 'external' };
      }
      // Otherwise try as iframe embed
      return { type: 'iframe', url: videoUrl, videoType: 'external' };
    default:
      return null;
  }
}
