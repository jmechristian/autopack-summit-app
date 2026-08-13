import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { MAX_CONTENT_WIDTH } from '../utils/layout';

/**
 * Full-width tab bar chrome; nav items centered within the same max width as page content.
 */
export function CenteredTabBar(props: BottomTabBarProps) {
  return (
    <View style={styles.rail}>
      <View style={styles.inner}>
        <BottomTabBar
          {...props}
          style={[
            {
              position: 'relative',
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            props.style,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.2)',
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
});
