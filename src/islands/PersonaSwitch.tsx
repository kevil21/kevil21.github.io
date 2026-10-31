import { useStore } from '@nanostores/preact';
import { bindPersona, persona, personas, setPersona } from '@/lib/stores/persona';
import type { PersonaId } from '@/lib/schema';

export default function PersonaSwitch({ layout = 'stack' }: { layout?: 'stack' | 'row' }) {
  bindPersona();
  const current = useStore(persona);
  return (
    <div class={`persona-switch persona-switch--${layout}`} role="radiogroup" aria-label="Viewing as">
      {personas.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={current === p.id}
          class="persona-switch__btn"
          data-persona={p.id}
          onClick={() => setPersona(p.id as PersonaId)}
        >
          <span class="persona-switch__label">{p.label}</span>
          <span class="persona-switch__hint">{p.hint}</span>
        </button>
      ))}
    </div>
  );
}
