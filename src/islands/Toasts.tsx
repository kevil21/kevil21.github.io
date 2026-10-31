import { useStore } from '@nanostores/preact';
import { toasts } from '@/lib/stores/ui';

export default function Toasts() {
  const list = useStore(toasts);
  return (
    <div class="toasts" role="status" aria-live="polite" aria-atomic="false">
      {list.map((t) => (
        <div key={t.id} class="toast" data-tone={t.tone ?? 'info'}>
          {t.tool && <span class="toast__tool">tool · {t.tool}</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
