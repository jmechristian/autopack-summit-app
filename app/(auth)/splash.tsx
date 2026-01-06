import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SPLASH_DURATION = 2000; // 2 seconds

export default function SplashScreen() {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Animate progress bar from 0 to 100% over the splash duration
    progress.value = withTiming(1, { duration: SPLASH_DURATION });

    // Auto-navigate to login after showing splash
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(800)} style={styles.imageContainer}>
        <Image
          source={require('../../assets/images/splash.png')}
          style={styles.image}
          resizeMode='contain'
        />
      </Animated.View>

      {/* Animated Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>

      {/* 
        Future animated elements can be added here, for example:
        <Animated.View entering={FadeIn.delay(400).duration(600)}>
          <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
        </Animated.View>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#005892', // apDarkBlue
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700', // Yellow/gold color to match brand
    borderRadius: 2,
  },
  // Example style for future animated icon
  // icon: {
  //   width: 120,
  //   height: 120,
  //   position: 'absolute',
  //   top: '20%',
  // },
});
