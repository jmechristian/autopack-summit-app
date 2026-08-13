import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useContentFrame } from '../utils/layout';

type Props = {
  children: React.ReactNode;
  phone?: number;
  style?: StyleProp<ViewStyle>;
  /** When false, only centers the frame — caller applies horizontal padding. */
  padded?: boolean;
};

/**
 * Centers interior page content at MAX_CONTENT_WIDTH on wide viewports.
 */
export function ContentFrame({ children, phone = 20, style, padded = true }: Props) {
  const { frame, inset } = useContentFrame(phone);

  return (
    <View style={[styles.rail, style]} pointerEvents='box-none'>
      <View
        style={[styles.frame, frame, padded && { paddingHorizontal: inset }]}
        pointerEvents='box-none'
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
  },
  frame: {
    width: '100%',
    flex: 1,
  },
});
