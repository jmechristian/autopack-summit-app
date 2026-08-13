import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MAX_CONTENT_WIDTH } from '../utils/layout';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Centers section stacks (headers + screens) at {@link MAX_CONTENT_WIDTH}.
 * Tab bar stays full-bleed outside this shell.
 */
export function ContentWidthShell({ children, style }: Props) {
  return (
    <View style={[styles.rail, style]} pointerEvents='box-none'>
      <View style={styles.frame} pointerEvents='box-none'>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
});
