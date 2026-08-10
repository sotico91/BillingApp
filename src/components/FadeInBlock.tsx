import { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  delay?: number;
  index?: number;
};

export function FadeInBlock({ children, delay = 0, index = 0 }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay + index * 70)
        .springify()
        .damping(18)
        .stiffness(140)}>
      {children}
    </Animated.View>
  );
}
