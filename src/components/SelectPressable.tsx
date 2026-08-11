import { Pressable, type PressableProps } from 'react-native';

import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = PressableProps & {
  /** Skip click sound/haptic (e.g. destructive confirms). Default true. */
  feedback?: boolean;
};

/**
 * Pressable that plays a soft key-click + selection haptic on press.
 */
export function SelectPressable({
  feedback = true,
  onPress,
  onPressIn,
  ...rest
}: Props) {
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        if (feedback && !rest.disabled) tapFeedback();
        onPressIn?.(e);
      }}
      onPress={onPress}
    />
  );
}
