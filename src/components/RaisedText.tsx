import { StyleSheet, Text, View, type TextProps, type TextStyle } from 'react-native';

type Tone = 'brand' | 'gold';

type Props = TextProps & {
  tone?: Tone;
};

const HIGHLIGHT: Record<Tone, string> = {
  brand: 'rgba(255,255,255,0.42)',
  gold: 'rgba(255,248,220,0.5)',
};

const SHADOW: Record<Tone, string> = {
  brand: 'rgba(6,16,24,0.38)',
  gold: 'rgba(70,42,8,0.4)',
};

/**
 * Light edge on top + dark edge below so Fraunces titles sit slightly raised.
 */
export function RaisedText({ tone = 'brand', style, children, ...rest }: Props) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return (
    <View>
      <Text
        {...rest}
        accessible={false}
        importantForAccessibility="no"
        pointerEvents="none"
        style={[
          style,
          styles.layer,
          {
            color: SHADOW[tone],
            top: 1.4,
            left: 0.2,
          },
        ]}>
        {children}
      </Text>
      <Text
        {...rest}
        style={[
          style,
          {
            textShadowColor: HIGHLIGHT[tone],
            textShadowOffset: { width: 0, height: -0.7 },
            textShadowRadius: 0.6,
            color: flat?.color,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    textShadowColor: 'transparent',
  },
});
