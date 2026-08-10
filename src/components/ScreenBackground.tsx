import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/src/theme/colors';

type Props = {
  children: ReactNode;
  edges?: 'top' | 'none';
};

export function ScreenBackground({ children, edges = 'top' }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1B3A4B', '#245D6B', '#2EC4B6']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbCoral]} />
      <View style={[styles.orb, styles.orbGold]} />
      <View style={[styles.orb, styles.orbTeal]} />
      <View
        style={[
          styles.content,
          { paddingTop: edges === 'top' ? insets.top + 8 : 0 },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbCoral: {
    width: 300,
    height: 300,
    top: -100,
    right: -80,
    backgroundColor: 'rgba(255,107,74,0.35)',
  },
  orbGold: {
    width: 220,
    height: 220,
    top: 220,
    left: -90,
    backgroundColor: 'rgba(244,201,93,0.28)',
  },
  orbTeal: {
    width: 180,
    height: 180,
    bottom: 80,
    right: -40,
    backgroundColor: 'rgba(46,196,182,0.30)',
  },
});
