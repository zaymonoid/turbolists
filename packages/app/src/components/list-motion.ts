import { animate } from "@lit-labs/motion";

/** Animate layout changes without scaling text or delaying removal of controls. */
export const listMotion = () =>
  animate(() => ({
    disabled: matchMedia("(prefers-reduced-motion: reduce)").matches,
    keyframeOptions: {
      duration: 260,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    },
    properties: ["left", "top"],
    in: [{ opacity: 0, transform: "translateY(8px)" }],
  }));
