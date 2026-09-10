import { StyleSheet, Text, View } from 'react-native';
import { autopackColors } from '../../theme';

/** Compact list mark. Not a star — that icon is already used for favorites. */
export function RisingStarMark() {
  return (
    <View style={styles.mark} accessibilityLabel='Rising Star honoree'>
      <Text style={styles.text}>RS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    minWidth: 22,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: '#0C3B68',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: autopackColors.apYellow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
