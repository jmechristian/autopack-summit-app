import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { parseVideoEmbed } from '../../utils/videoEmbed';

type Props = {
  url?: string | null;
  caption?: string | null;
};

/** App origin YouTube requires as HTTP Referer in WebViews (Error 153 without it). */
const EMBED_ORIGIN = 'https://com.packagingschool.autopacksummit';

function buildPlayerHtml(embedUrl: string) {
  const src =
    embedUrl.includes('youtube.com') || embedUrl.includes('youtube-nocookie.com')
      ? `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}playsinline=1&rel=0&origin=${encodeURIComponent(EMBED_ORIGIN)}`
      : embedUrl;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #111827; overflow: hidden; }
      iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe
      src="${src}"
      title="Video"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
}

/**
 * Inline YouTube / Vimeo player for exhibitor profiles.
 */
export function ExhibitorVideoEmbed({ url, caption }: Props) {
  const parsed = parseVideoEmbed(url);
  if (!parsed) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.player}>
        <WebView
          source={{
            html: buildPlayerHtml(parsed.embedUrl),
            baseUrl: EMBED_ORIGIN,
          }}
          style={styles.webview}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          allowsInlineMediaPlayback
          originWhitelist={['*']}
        />
      </View>
      {!!caption?.trim() && <Text style={styles.caption}>{caption.trim()}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  webview: {
    flex: 1,
    backgroundColor: '#111827',
  },
  caption: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ExhibitorVideoEmbed;
