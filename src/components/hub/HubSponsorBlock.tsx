import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { autopackColors } from '../../theme';

const PS_LOGO = require('../../../assets/ps-logo-square.svg');
const SPONSOR_EXHIBITOR_ID = 'a7c78415-c5e6-4338-af3f-7873c2ebf65d';

/**
 * App sponsor callout for Hub — links to Packaging School exhibitor profile.
 */
export function HubSponsorBlock() {
  return (
    <View style={styles.card}>
      <Image source={PS_LOGO} style={styles.logo} contentFit="contain" />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>APP SPONSOR</Text>
        <Text style={styles.headline}>
          Thank you to our app sponsor,{' '}
          <Text style={styles.headlineAccent}>PackagingSchool.com</Text>
        </Text>
        <Text style={styles.body}>
          Learn the language of packaging. Make better packaging decisions.
        </Text>
        <Pressable
          style={styles.cta}
          onPress={() =>
            router.push({
              pathname: '/(main)/hub/exhibitors/[id]',
              params: { id: SPONSOR_EXHIBITOR_ID },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Visit Packaging School at Booth 33"
        >
          <Text style={styles.ctaText}>Visit them at Booth 33</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFF9EB',
    borderWidth: 1.5,
    borderColor: autopackColors.apYellow,
  },
  logo: {
    width: 88,
    height: 88,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#4b5563',
  },
  headline: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 20,
  },
  headlineAccent: {
    color: autopackColors.apBlue,
    fontWeight: '800',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: autopackColors.apYellow,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default HubSponsorBlock;
