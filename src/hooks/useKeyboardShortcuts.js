/**
 * ============================================================================
 * useKeyboardShortcuts HOOK
 * ============================================================================
 *
 * Global keyboard shortcuts for media controls and app navigation.
 *
 * Shortcuts:
 * - Space: Play/Pause
 * - Left Arrow: Previous track
 * - Right Arrow: Next track
 * - Up Arrow: Volume up
 * - Down Arrow: Volume down
 * - M: Mute/unmute
 * - Escape: Close active window / Close start menu
 */

import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  volume,
  onVolumeChange,
  onMuteToggle,
  onCloseWindow,
  onCloseStartMenu,
  isStartMenuOpen,
  enabled = true,
}) {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in an input
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable
    ) {
      return;
    }

    // Don't trigger if modifier keys are pressed (except for some shortcuts)
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (isPlaying) {
          onPause?.();
        } else {
          onPlay?.();
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        onPrevious?.();
        break;

      case 'ArrowRight':
        event.preventDefault();
        onNext?.();
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (volume < 100) {
          onVolumeChange?.(Math.min(100, volume + 10));
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (volume > 0) {
          onVolumeChange?.(Math.max(0, volume - 10));
        }
        break;

      case 'KeyM':
        event.preventDefault();
        onMuteToggle?.();
        break;

      case 'Escape':
        event.preventDefault();
        if (isStartMenuOpen) {
          onCloseStartMenu?.();
        } else {
          onCloseWindow?.();
        }
        break;

      default:
        break;
    }
  }, [
    isPlaying,
    onPlay,
    onPause,
    onNext,
    onPrevious,
    volume,
    onVolumeChange,
    onMuteToggle,
    onCloseWindow,
    onCloseStartMenu,
    isStartMenuOpen,
  ]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export default useKeyboardShortcuts;
