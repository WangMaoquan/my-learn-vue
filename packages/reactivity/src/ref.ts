import { hasChanged } from './../../shared/index';
import {
  activeEffect,
  ReactiveEffect,
  shouldTrack,
  trackEffects,
  triggerEffects,
} from './effect';
import { isShallow, toRaw, toReactive, isReadonly } from './reactive';

declare const RefSymbol: unique symbol;
export interface Ref<T = any> {
  value: T;
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true;
}

class RefImpl<T> {
  public dep: Set<ReactiveEffect> = new Set();
  private _value: T;
  private _rawValue: T;
  public readonly __v_isRef = true;
  constructor(value: T) {
    this._rawValue = toRaw(value);
    this._value = toReactive(value);
  }
  get value() {
    if (shouldTrack && activeEffect) {
      trackEffects(this.dep);
    }
    return this._value;
  }

  set value(newValue) {
    const useDirectValue = isShallow(newValue) || isReadonly(newValue);
    newValue = useDirectValue ? newValue : toRaw(newValue);
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = useDirectValue ? newValue : toReactive(newValue);
      triggerEffects(this.dep);
    }
  }
}

export function ref<T extends object>(
  value: T,
): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>;
export function ref<T>(value: T): Ref<UnwrapRef<T>>;
export function ref<T = any>(): Ref<T | undefined>;
export function ref(value?: unknown) {
  return new RefImpl(value) as any;
}

type UnwrapRef<T> = T extends Ref<infer V>
  ? UnwrapRefSimple<V>
  : UnwrapRefSimple<T>;

// 传入的T 是number | string | boolean | Ref 时直接返回T, 如果传入的是一个object 对每个键执行重复的判断
export type UnwrapRefSimple<T> = T extends number | string | boolean | Ref
  ? T
  : T extends object
  ? {
      [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
    }
  : T;
