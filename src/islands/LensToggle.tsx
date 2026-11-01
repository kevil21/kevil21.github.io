/** Lens toggle: renders the lens state; the click is handled by the shell (data-action="lens") so it works before hydration. */
import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { lens, startLens } from '@/ai/runtime/lens';

export default function LensToggle() {
  const v = useStore(lens);
  useEffect(() => startLens(), []);
  return (
    <button
      type="button"
      class="lens-toggle"
      role="switch"
      aria-checked={v === 'engineer'}
      aria-label={`Engineer lens ${v === 'engineer' ? 'on' : 'off'}: show source pointers and decision depth`}
      data-action="lens"
    >
      <span class="lens-toggle__knob" aria-hidden="true" />
      {v === 'engineer' ? 'Engineer lens' : 'Recruiter lens'}
    </button>
  );
}
