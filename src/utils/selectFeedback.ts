import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let player: AudioPlayer | null = null;
let loading: Promise<void> | null = null;
let enabled = true;

/**
 * Click WAV + expo-audio MediaSession is unreliable on Android emulators
 * (can steal focus from TextInput and surface session errors).
 * Keep the soft key sound on iOS; Android uses haptic only.
 */
const AUDIO_CLICK_ENABLED = Platform.OS === 'ios';

async function ensurePlayer(): Promise<AudioPlayer | null> {
  if (!AUDIO_CLICK_ENABLED) return null;
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

/** Warm up audio on app start so the first tap is instant (iOS only). */
export function prepareSelectFeedback(): void {
  if (AUDIO_CLICK_ENABLED) void ensurePlayer();
}

/** Soft key-click (iOS) + selection haptic for option taps. */
export function tapFeedback(): void {
  if (!enabled) return;
  if (Platform.OS !== 'web') {
    void Haptics.selectionAsync().catch(() => undefined);
  }
  if (!AUDIO_CLICK_ENABLED) return;
  void (async () => {
    const p = await ensurePlayer();
    if (!p) return;
    try {
      await p.seekTo(0);
      p.play();
    } catch {
      /* ignore playback glitches */
    }
  })();
}

export function setSelectFeedbackEnabled(value: boolean): void {
  enabled = value;
}
