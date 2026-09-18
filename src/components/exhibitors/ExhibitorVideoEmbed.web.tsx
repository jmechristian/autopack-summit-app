import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { parseVideoEmbed, videoEmbedSrc } from '../../utils/videoEmbed';

type Props = {
  url?: string | null;
  caption?: string | null;
};

function webOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : undefined;
}

/**
 * Inline YouTube / Vimeo player for exhibitor profiles on web.
 * react-native-webview has no web implementation, so this uses a real iframe.
 */
export function ExhibitorVideoEmbed({ url, caption }: Props) {
  const parsed = parseVideoEmbed(url);
  if (!parsed) return null;

  const src = videoEmbedSrc(parsed.embedUrl, webOrigin());

  return (
    <View style={styles.wrap}>
      <View style={styles.player}>
        {createElement('iframe', {
          src,
          title: 'Video',
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
          allowFullScreen: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            border: 0,
          },
        })}
      </View>
      {!!caption?.trim() && <Text style={styles.caption}>{caption.trim()}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  player: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  caption: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ExhibitorVideoEmbed;
