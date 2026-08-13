import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const APP_GUIDE_URL = 'https://autopacksummit.com/appguide';

type Props = {
  iconButtonStyle?: StyleProp<ViewStyle>;
  iconSize?: number;
};

/**
 * Hub help control. Uses the native action sheet / alert instead of a RN Modal
 * so we don't stack a Modal on top of the Hub Rive view (known iOS freeze risk).
 */
export function HubHelpMenu({ iconButtonStyle, iconSize = 22 }: Props) {
  const openingRef = useRef(false);

  const openAppGuide = async () => {
    try {
      await Linking.openURL(APP_GUIDE_URL);
    } catch {
      // ignore
    }
  };

  const openFeedback = () => {
    router.push('/(main)/hub/feedback');
  };

  const openMenu = () => {
    if (openingRef.current) return;
    openingRef.current = true;

    const finish = () => {
      openingRef.current = false;
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'App Guide', 'Feedback'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          finish();
          if (buttonIndex === 1) void openAppGuide();
          if (buttonIndex === 2) openFeedback();
        }
      );
      return;
    }

    Alert.alert(
      'Help',
      undefined,
      [
        {
          text: 'App Guide',
          onPress: () => {
            finish();
            void openAppGuide();
          },
        },
        {
          text: 'Feedback',
          onPress: () => {
            finish();
            openFeedback();
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: finish },
      ],
      { cancelable: true, onDismiss: finish }
    );
  };

  return (
    <View collapsable={false}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openMenu}
        style={iconButtonStyle}
        accessibilityRole="button"
        accessibilityLabel="Help"
      >
        <Ionicons name="help-circle-outline" size={iconSize} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default HubHelpMenu;
