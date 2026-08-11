import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let player: AudioPlayer | null = null;
let loading: Promise<void> | null = null;
let enabled = true;

async function ensurePlayer(): Promise<AudioPlayer | null> {
  if (Platform.OS === 'web') return null;
  if (player) return player;
  if (!loading) {
    loading = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: false,
          interruptionMode: 'mixWithOthers',
          shouldPlayInBackground: false,
        });
        player = createAudioPlayer(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../assets/sounds/click.wav')
        );
        player.volume = 0.4;
      } catch {
        player = null;
      }
    })();
  }
  await loading;
  return player;
}

/** Warm up audio on app start so the first tap is instant. */
export function prepareSelectFeedback(): void {
  void ensurePlayer();
}

/** Soft key-click + selection haptic for option taps. */
export function tapFeedback(): void {
  if (!enabled) return;
  if (Platform.OS !== 'web') {
    void Haptics.selectionAsync().catch(() => undefined);
  }
  void (async () => {
    const p = await ensurePlayer();
    if (!p) return;
    try {
      await p.seekTo(0);
      p.play();
    } catch {
      /* ignore */
    }
  })();
}

export function setSelectFeedbackEnabled(value: boolean): void {
  enabled = value;
}
