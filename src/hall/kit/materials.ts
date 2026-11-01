/**
 * The kit's material palette: one set of shared materials bound to the colour tokens through the theme bridge.
 * Every machine part uses one of these, so the whole floor shares a material language and follows the theme live.
 * Colours are set from tokens only (no literals; see scripts/lint-tokens.ts).
 */
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three';
import { onThemeChange, tokenColor, tokenScalar, type TokenName } from '@/theme/bridge';

export type PaletteKey =
  | 'steel'
  | 'steelDark'
  | 'enamel'
  | 'brass'
  | 'glass'
  | 'floor'
  | 'wall'
  | 'lampOn'
  | 'lampOff'
  | 'teal'
  | 'sage'
  | 'ember'
  | 'screen';

interface Binding {
  color: TokenName;
  emissive?: TokenName;
  emissiveScale?: number;
}

const BINDINGS: Record<PaletteKey, Binding> = {
  steel: { color: '--fill-steel' },
  steelDark: { color: '--fill-steel-dark' },
  enamel: { color: '--fill-enamel' },
  brass: { color: '--fill-brass' },
  glass: { color: '--fill-glass' },
  floor: { color: '--bg-floor' },
  wall: { color: '--bg-hall' },
  lampOn: { color: '--fill-amber', emissive: '--fill-amber', emissiveScale: 1.6 },
  lampOff: { color: '--fill-amber-dim' },
  teal: { color: '--fill-teal', emissive: '--fill-teal', emissiveScale: 0.5 },
  sage: { color: '--fill-sage', emissive: '--fill-sage', emissiveScale: 0.4 },
  ember: { color: '--fill-ember', emissive: '--fill-ember', emissiveScale: 0.7 },
  screen: { color: '--surface-3', emissive: '--fill-teal', emissiveScale: 0.35 },
};

function toColor(name: TokenName): Color {
  const { r, g, b } = tokenColor(name);
  // Tokens are gamma-encoded sRGB; Three.js works in linear by default.
  return new Color().setRGB(r, g, b, 'srgb');
}

export class Palette {
  readonly materials: Record<PaletteKey, MeshStandardMaterial | MeshPhysicalMaterial>;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.materials = {
      steel: new MeshStandardMaterial({ metalness: 0.85, roughness: 0.35 }),
      steelDark: new MeshStandardMaterial({ metalness: 0.9, roughness: 0.5 }),
      enamel: new MeshStandardMaterial({ metalness: 0.1, roughness: 0.6 }),
      brass: new MeshStandardMaterial({ metalness: 0.95, roughness: 0.3 }),
      glass: new MeshPhysicalMaterial({
        metalness: 0,
        roughness: 0.08,
        transmission: 0.6,
        thickness: 0.4,
        transparent: true,
        opacity: 0.55,
      }),
      floor: new MeshStandardMaterial({ metalness: 0.4, roughness: 0.25 }),
      wall: new MeshStandardMaterial({ metalness: 0, roughness: 0.95 }),
      lampOn: new MeshStandardMaterial({ metalness: 0, roughness: 0.4 }),
      lampOff: new MeshStandardMaterial({ metalness: 0, roughness: 0.6 }),
      teal: new MeshStandardMaterial({ metalness: 0.2, roughness: 0.5 }),
      sage: new MeshStandardMaterial({ metalness: 0.2, roughness: 0.5 }),
      ember: new MeshStandardMaterial({ metalness: 0.2, roughness: 0.5 }),
      screen: new MeshStandardMaterial({ metalness: 0.1, roughness: 0.3 }),
    };
    this.apply();
    this.unsubscribe = onThemeChange(() => this.apply());
  }

  /** Re-read every token and update the materials in place (no re-allocation, so instanced meshes keep working). */
  apply(): void {
    const boost = tokenScalar('--emissive-boost', 1);
    for (const key of Object.keys(BINDINGS) as PaletteKey[]) {
      const b = BINDINGS[key];
      const mat = this.materials[key];
      mat.color.copy(toColor(b.color));
      if (b.emissive) {
        mat.emissive.copy(toColor(b.emissive));
        mat.emissiveIntensity = (b.emissiveScale ?? 1) * boost;
      } else {
        mat.emissive.setRGB(0, 0, 0);
        mat.emissiveIntensity = 0;
      }
      mat.needsUpdate = true;
    }
  }

  get(key: PaletteKey): Material {
    return this.materials[key];
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const m of Object.values(this.materials)) m.dispose();
  }
}

/** Convenience for lights and fog: a token as a linear Color. */
export function lightColor(name: TokenName): Color {
  return toColor(name);
}
