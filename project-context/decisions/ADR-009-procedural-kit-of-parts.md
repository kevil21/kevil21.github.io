# ADR-009 · The kit of parts is procedural geometry in code, not binary glTF assets

**Status:** accepted · 2026-11-01 · Scene 3

## Decision
Tanks, pipes, valves, gauges, levers, conveyors, printers, cabinets, screens, lamps, cables, coils, turbines, hoppers,
jars and dials are **geometry factories** in `src/hall/kit/` built from Three.js primitives (lathe, tube, extrude, box,
cylinder) with shared `BufferGeometry` instances and one material palette (`src/hall/kit/materials.ts`) bound to the
colour tokens through the theme bridge. Machines are assembled from these factories; repeated parts use
`InstancedMesh`. No binary model files live in the repository.

## Why
- One material language and one token-driven palette fall out naturally when every part is built from the same code.
- There is no 3D artist and no binary-asset pipeline; procedural parts are reviewable in a diff and theme-aware by
  construction (emissive lamps read `--fill-amber`).
- Geometry is tiny compared with textures or glTF buffers; the 3D bundle cost is the renderer, not the kit.

## Consequences
- The prompt's "glTF library with Draco/Meshopt" is honoured in spirit (one shared library, shared materials) but not as
  files. A `scripts/export-kit.ts` that writes a glTF from the factories can be added later if assets are needed
  outside the site; Draco/Meshopt compression is not applicable to geometry generated at runtime.
- Visual richness comes from materials, lighting, fog and bloom (on capable devices), not from sculpted detail.

## Rejected
- **Authoring glTF in Blender and committing `.glb` files:** no artist, opaque binaries in git, theme colours baked
  into materials unless every material is remapped on load.
- **Downloading a third-party industrial asset pack:** licensing review, visual mismatch, large downloads.
