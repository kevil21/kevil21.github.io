# ADR-010 · Three.js `WebGPURenderer` with automatic WebGL 2 fallback, static twins without it

**Status:** accepted · 2026-11-01 · Scene 3

## Decision
The hall renders with `WebGPURenderer` from `three/webgpu` (three 0.187). Capability is feature-detected:
`navigator.gpu?.requestAdapter()` succeeds → WebGPU backend; otherwise the same renderer is created with
`forceWebGL: true` (WebGL 2 backend, the path on iOS/Safari); no WebGL 2 → no canvas, the HTML twins stand alone.
Materials are standard Three.js materials (converted to node materials by the renderer) so one code path serves both
backends; custom effects (particles) use TSL nodes, which compile to WGSL or GLSL as needed. The 3D module is loaded
with a dynamic `import()` after first paint and is split into its own chunk (`manualChunks: three`).

## Why
- Prompt: WebGPU first with WebGL2 fallback and static SVG/HTML for no-JS.
- One renderer with two backends avoids maintaining two scene graphs or two shader languages.
- Standard materials keep the kit simple; TSL is used only where a shader is genuinely needed.

## Known limits
- The WebGPU backend is verified only on Apple silicon in Chrome locally; CI's Chromium has no adapter (inherited
  lesson), so CI tests exercise the WebGL path. The Full-Brain check and a manual WebGPU render check run locally.
- Post-processing (bloom) is enabled only above a measured frame-time budget and never on the phone profile.

## Rejected
- **`WebGLRenderer` only:** simpler, but the prompt asks for WebGPU first and the particle simulations benefit from compute.
- **Babylon.js / PlayCanvas:** heavier runtime; Three.js has the TSL dual-backend story and TRACE experience.
