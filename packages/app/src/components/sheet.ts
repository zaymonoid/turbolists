/**
 * iOS-style bottom sheet behaviour for modal <dialog> elements: spring in,
 * spring out, and drag down to dismiss (from anywhere while the sheet's
 * content is scrolled to the top). The backdrop fades with the sheet's
 * position via the `--sheet-progress` custom property, which the dialog's
 * `::backdrop` inherits.
 *
 * Motion runs in JS (requestAnimationFrame) so a release can carry the
 * finger's velocity into the spring, and so reduced motion is honoured here
 * rather than only in CSS.
 */

const DISMISS_FRACTION = 0.3;
const DISMISS_VELOCITY = 800; // px/s, downward fling
const DRAG_SLOP = 8;
const STIFFNESS = 520;
const DAMPING = 2 * Math.sqrt(STIFFNESS); // critically damped: no bounce

interface SheetState {
  offset: number;
  velocity: number;
  frame: number;
  closing: boolean;
}

const states = new WeakMap<HTMLDialogElement, SheetState>();

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Distance that moves the sheet fully below the viewport. */
function travel(dialog: HTMLDialogElement) {
  const r = dialog.getBoundingClientRect();
  return Math.max(1, window.innerHeight - (r.top - currentOffset(dialog)));
}

function currentOffset(dialog: HTMLDialogElement) {
  return states.get(dialog)?.offset ?? 0;
}

function apply(dialog: HTMLDialogElement, offset: number) {
  const state = states.get(dialog)!;
  state.offset = offset;
  dialog.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : "";
  const progress = Math.min(1, Math.max(0, 1 - offset / travel(dialog)));
  dialog.style.setProperty("--sheet-progress", String(progress));
}

function springTo(
  dialog: HTMLDialogElement,
  target: number,
  onSettle?: () => void,
  /** Finish here instead of easing into `target` (used to exit briskly). */
  stopAt?: number,
) {
  const state = states.get(dialog)!;
  cancelAnimationFrame(state.frame);
  if (reducedMotion()) {
    apply(dialog, stopAt ?? target);
    state.velocity = 0;
    onSettle?.();
    return;
  }
  let last = performance.now();
  const step = (now: number) => {
    // Clamp dt so a stalled frame can't explode the integration.
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    const accel = -STIFFNESS * (state.offset - target) -
      DAMPING * state.velocity;
    state.velocity += accel * dt;
    const next = state.offset + state.velocity * dt;
    const end = stopAt ?? target;
    const settled = (stopAt !== undefined && next >= stopAt) ||
      (Math.abs(next - target) < 0.5 && Math.abs(state.velocity) < 10);
    if (settled) {
      apply(dialog, end);
      state.velocity = 0;
      onSettle?.();
    } else {
      apply(dialog, next);
      state.frame = requestAnimationFrame(step);
    }
  };
  state.frame = requestAnimationFrame(step);
}

/** Show `dialog` modally and slide it up from the bottom edge. */
export function presentSheet(dialog: HTMLDialogElement) {
  if (dialog.open) return;
  dialog.classList.add("sheet-motion");
  dialog.showModal();
  const state: SheetState = { offset: 0, velocity: 0, frame: 0, closing: false };
  states.set(dialog, state);
  attachDrag(dialog);
  if (!reducedMotion()) {
    apply(dialog, travel(dialog));
    springTo(dialog, 0);
  }
}

/**
 * Slide the sheet away, then close it. `onClosed` runs after `close()`;
 * use it for cleanup such as removing the element. Safe to call repeatedly.
 */
export function dismissSheet(
  dialog: HTMLDialogElement,
  onClosed?: () => void,
) {
  const state = states.get(dialog);
  if (!state) {
    if (dialog.open) dialog.close();
    onClosed?.();
    return;
  }
  if (state.closing) return;
  state.closing = true;
  dialog.style.pointerEvents = "none";
  // Let the keyboard slide away alongside the sheet.
  (document.activeElement as HTMLElement | null)?.blur?.();
  const distance = travel(dialog);
  springTo(dialog, distance * 1.4, () => {
    states.delete(dialog);
    if (dialog.open) dialog.close();
    onClosed?.();
  }, distance);
}

/** Rubber-band resistance when pulling the sheet above its resting place. */
const resist = (dy: number) => -Math.sqrt(-dy) * 2.5;

function attachDrag(dialog: HTMLDialogElement) {
  let startY = 0;
  let startX = 0;
  let startOffset = 0;
  let tracking = false;
  let dragging = false;
  let samples: { y: number; t: number }[] = [];

  const scrollerAtTop = (target: EventTarget | null) => {
    // Any scrolled ancestor inside the sheet owns the gesture.
    for (
      let el = target as HTMLElement | null;
      el && el !== dialog.parentElement;
      el = el.parentElement
    ) {
      if (el.scrollTop > 0) return false;
      if (el === dialog) break;
    }
    return true;
  };

  dialog.addEventListener("touchstart", (e) => {
    const state = states.get(dialog);
    if (!state || state.closing || e.touches.length !== 1) return;
    const t = e.touches[0];
    tracking = scrollerAtTop(e.target);
    dragging = false;
    startY = t.clientY;
    startX = t.clientX;
    startOffset = state.offset;
    samples = [{ y: t.clientY, t: e.timeStamp }];
    // Catch a sheet that's still springing: the finger takes over.
    cancelAnimationFrame(state.frame);
  }, { passive: true });

  dialog.addEventListener("touchmove", (e) => {
    const state = states.get(dialog);
    if (!tracking || !state || state.closing) return;
    const t = e.touches[0];
    const dy = t.clientY - startY;
    if (!dragging) {
      const dx = t.clientX - startX;
      if (Math.abs(dy) < DRAG_SLOP && startOffset === 0) return;
      // Horizontal swipes and upward scrolls belong to the content.
      if (Math.abs(dx) > Math.abs(dy) || (dy < 0 && startOffset === 0)) {
        tracking = false;
        return;
      }
      dragging = true;
      startY = t.clientY;
      (document.activeElement as HTMLElement | null)?.blur?.();
    }
    e.preventDefault();
    const raw = startOffset + (t.clientY - startY);
    apply(dialog, raw < 0 ? resist(raw) : raw);
    samples.push({ y: t.clientY, t: e.timeStamp });
    if (samples.length > 5) samples.shift();
  }, { passive: false });

  const release = () => {
    const state = states.get(dialog);
    const wasDragging = dragging;
    tracking = false;
    dragging = false;
    if (!state || state.closing) return;
    if (!wasDragging) {
      if (state.offset !== 0) springTo(dialog, 0);
      return;
    }
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    const velocity = dt > 0 ? (last.y - first.y) / dt : 0;
    state.velocity = velocity;
    const flung = velocity > DISMISS_VELOCITY;
    const far = state.offset > travel(dialog) * DISMISS_FRACTION &&
      velocity > -200;
    if (flung || far) {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    } else springTo(dialog, 0);
    // A drag that started on a button must not also activate it.
    dialog.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(
      () => dialog.removeEventListener("click", swallow, { capture: true }),
      400,
    );
  };
  dialog.addEventListener("touchend", release);
  dialog.addEventListener("touchcancel", release);
}

function swallow(e: Event) {
  e.stopPropagation();
  e.preventDefault();
}
