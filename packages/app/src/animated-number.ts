/**
 * Lit ReactiveController that animates a number toward a target using
 * exponential decay. Fast start, smooth deceleration, no overshoot.
 */

import type { ReactiveController, ReactiveControllerHost } from "lit";

const RATE = 60; // ~95% in ~50ms
const EPSILON = 0.01;

export class AnimatedNumber implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _raf = 0;
  private _lastTime = 0;
  private _target = 0;

  value = 0;

  constructor(host: ReactiveControllerHost, initial = 0) {
    this._host = host;
    this.value = initial;
    this._target = initial;
    host.addController(this);
  }

  set target(v: number) {
    if (v === this._target) return;
    this._target = v;
    if (!this._raf) {
      this._lastTime = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  get target() {
    return this._target;
  }

  private _tick = (now: number) => {
    const dt = Math.min((now - this._lastTime) / 1000, 0.064);
    this._lastTime = now;

    this.value += (this._target - this.value) * (1 - Math.exp(-RATE * dt));

    if (Math.abs(this.value - this._target) < EPSILON) {
      this.value = this._target;
      this._raf = 0;
    } else {
      this._raf = requestAnimationFrame(this._tick);
    }

    this._host.requestUpdate();
  };

  hostConnected(): void {}

  hostDisconnected(): void {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }
}
