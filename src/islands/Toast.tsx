/** Egg toasts: announce a triggered egg with its message and a link; polite live region; dismissible; keyboard-reachable. */
import { useEffect, useState } from 'preact/hooks';
import { EGG_EVENT, type EggDetail } from '@/hall/eggs';

export default function Toast() {
  const [items, setItems] = useState<Array<EggDetail & { key: number }>>([]);
  useEffect(() => {
    let n = 0;
    const onEgg = (e: Event) => {
      const d = (e as CustomEvent<EggDetail>).detail;
      const key = ++n;
      setItems((list) => [...list, { ...d, key }].slice(-3));
      window.setTimeout(() => setItems((list) => list.filter((x) => x.key !== key)), 12000);
    };
    window.addEventListener(EGG_EVENT, onEgg);
    return () => window.removeEventListener(EGG_EVENT, onEgg);
  }, []);
  if (!items.length) return null;
  return (
    <div class="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div class="toast" key={t.key} data-egg={t.egg}>
          <p class="toast__text">{t.message}</p>
          <div class="toast__row">
            {t.href && (
              <a class="toast__link" href={t.href}>
                {t.label ?? 'Open'}
              </a>
            )}
            <button
              type="button"
              class="toast__close"
              onClick={() => setItems((list) => list.filter((x) => x.key !== t.key))}
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
