# Zuno Stack performance P0

The visual redesign must never trade responsiveness for decoration.

Forbidden in the visual layer: MutationObserver, requestAnimationFrame loops, polling timers, duplicate render trees, permanent particle systems, continuous filters/animations, or additional work on every touch beyond the existing state transition/render.

The board renderer computes geometry bounds once per render pass. Low-end devices disable the aura and tile transitions and use simplified shadows.