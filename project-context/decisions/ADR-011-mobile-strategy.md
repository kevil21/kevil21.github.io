# ADR-011 — Mobile strategy and capability detection

**Status:** accepted · 2026-11-01

One adaptive application (plan.md §10, ADR-004). Capabilities are detected by **feature**, never by
user-agent or screen width: Web Workers, WebAssembly, WebGL, WebGPU adapter + `shader-f16`,
`navigator.storage.estimate`, Save-Data, `deviceMemory` (where exposed), pointer coarseness, online
state. Layout adapts with container queries; the trace becomes a vertical rail timeline, span details
open in a bottom sheet (`<dialog>`), and a thumb-reachable command bar replaces the rail.
Mobile keeps all content and the Pocket Brain; the Full Brain is available behind an explicit
"show the option anyway" control but is never offered automatically on coarse-pointer devices.
The semantic embedder (23 MB) is not auto-downloaded on coarse-pointer or Save-Data devices either;
lexical search works immediately and the visitor can enable semantic search from the palette state.
