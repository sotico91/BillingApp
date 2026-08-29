import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

/** Keyboard height in px. Prefer this inside Android Dialog/Modal (they do not resize). */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const apply = (e: KeyboardEvent) => {
      setHeight(Math.max(0, Math.round(e.endCoordinates.height)));
    };
    const hide = () => setHeight(0);

    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      apply
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      hide
    );
    const change = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame',
      (e) => {
        const next = Math.max(0, Math.round(e.endCoordinates.height));
        setHeight(next);
      }
    );
    return () => {
      show.remove();
      hideSub.remove();
      change.remove();
    };
  }, []);

  return height;
}

/** True while the software keyboard is on screen. */
export function useKeyboardVisible() {
  return useKeyboardHeight() > 0;
}
