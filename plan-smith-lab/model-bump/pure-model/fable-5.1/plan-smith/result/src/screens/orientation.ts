// D4: 세로 모드 안내. index.html의 #rotate-overlay를 matchMedia로 토글(CSS media query와 이중 안전).
import { watchOrientation } from '../viewport';

export function installOrientationOverlay(overlay: HTMLElement, onChange?: (portrait: boolean) => void): () => void {
  return watchOrientation((portrait) => {
    overlay.toggleAttribute('hidden', !portrait);
    onChange?.(portrait);
  });
}
