export type VideoProvider = 'youtube' | 'vimeo';

export type ParsedVideoEmbed = {
  provider: VideoProvider;
  id: string;
  embedUrl: string;
};

function cleanUrl(raw?: string | null) {
  return (raw || '').trim();
}

/**
 * Accept only YouTube / Vimeo links and return an embeddable player URL.
 */
export function parseVideoEmbed(raw?: string | null): ParsedVideoEmbed | null {
  const value = cleanUrl(raw);
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();

  // YouTube
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    if (id) {
      return {
        provider: 'youtube',
        id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
      };
    }
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const fromQuery = url.searchParams.get('v');
    const parts = url.pathname.split('/').filter(Boolean);
    const fromPath =
      parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v'
        ? parts[1]
        : null;
    const id = fromQuery || fromPath;
    if (id) {
      return {
        provider: 'youtube',
        id,
        embedUrl: `https://www.youtube.com/embed/${id}`,
      };
    }
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    // player.vimeo.com/video/123 or vimeo.com/123 or vimeo.com/channels/x/123
    let id: string | undefined;
    if (parts[0] === 'video' && parts[1]) id = parts[1];
    else if (parts[0] === 'channels' && parts[2]) id = parts[2];
    else if (/^\d+$/.test(parts[0] || '')) id = parts[0];
    if (id) {
      return {
        provider: 'vimeo',
        id,
        embedUrl: `https://player.vimeo.com/video/${id}`,
      };
    }
  }

  return null;
}

export function isAllowedVideoUrl(raw?: string | null) {
  const value = cleanUrl(raw);
  if (!value) return true; // empty is allowed (clears / omits)
  return !!parseVideoEmbed(value);
}
