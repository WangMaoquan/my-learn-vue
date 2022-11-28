import { canTrackEffect, ReactiveEffect, trackEffects, triggerEffects } from './effect';

export type ComputedGetter<T> = (...args: any) => T;

class ComputedRefImpl<T> {
  private _value!: T;
  public readonly effect: ReactiveEffect<T>;
  public readonly __v_isRef = true;
  public _dirty = true;
  private dep: Set<ReactiveEffect> = new Set();

  constructor(getter: ComputedGetter<T>) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerEffects(this.dep);
      }
    });
    // 说明是 computed 的effect
    this.effect.computed = true;
  }

  get value() {
    if (canTrackEffect()) {
      trackEffects(this.dep);
    }
    if (this._dirty) {
      this._dirty = false;
      this._value = this.effect.run();
    }

    return this._value;
  }
}

export function computed<T>(getter: ComputedGetter<T>) {
  return new ComputedRefImpl(getter);
}
