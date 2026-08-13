import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  uris: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
};

/**
 * Full-screen swipeable photo gallery.
 */
export function PhotoGalleryModal({ uris, initialIndex = 0, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    const next = Math.min(Math.max(initialIndex, 0), Math.max(uris.length - 1, 0));
    setIndex(next);
    // Let the modal mount, then jump to the tapped photo.
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: next, animated: false });
    });
  }, [visible, initialIndex, uris.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = viewableItems[0]?.index;
    if (typeof next === 'number') setIndex(next);
  }, []);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  if (!uris.length) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.counter}>
            {index + 1} / {uris.length}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close gallery"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={uris}
          style={styles.list}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialNumToRender={1}
          windowSize={3}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={({ index: failedIndex }) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: failedIndex, animated: false });
            }, 50);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height }}>
              <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
            </View>
          )}
          onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            if (next >= 0 && next < uris.length) setIndex(next);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  list: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  counter: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default PhotoGalleryModal;
