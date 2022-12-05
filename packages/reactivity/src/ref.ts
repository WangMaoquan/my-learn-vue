import { hasChanged, extend } from './../../shared/index';
import { CollectionTypes } from './collectionHandlers';
import {
  activeEffect,
  ReactiveEffect,
  shouldTrack,
  trackEffects,
  triggerEffects,
} from './effect';
import {
  isShallow,
  toRaw,
  toReactive,
  isReadonly,
  isReactive,
} from './reactive';

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
    // 判断value 是不是ref 再处理
    // 之前没有做这个处理 导致 typeof (ref(ref(1)).value + 1) 为 string
    this._rawValue = isRef<T>(value) ? unref<T>(value) : toRaw(value);
    this._value = isRef<T>(value) ? unref<T>(value) : toReactive(value);
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
// 先判断 是否是Array 后判断是否是 对象
export type UnwrapRefSimple<T> = T extends
  | number
  | string
  | boolean
  | Function
  | Ref
  | CollectionTypes
  ? T
  : T extends Array<any>
  ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
  : T extends object
  ? {
      [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
    }
  : T;

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>;
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true);
}

export function unref<T>(ref: Ref<T> | T): T {
  return isRef(ref) ? ref.value : ref;
}

const proxyRefsHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    // get的时候 如果是ref 返回 .value 否则返回本身 直接用unref 就行
    return unref(Reflect.get(target, key, receiver));
  },
  set(target, key, value, receiver) {
    // 怎么set
    // 如果old是ref 且value 不是ref直接修改 oldvalue.value = value
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  },
};

export type ShallowUnwrapRef<T> = {
  [K in keyof T]: T[K] extends Ref<infer V> ? V : T[K];
};

/**
 * 对象中key 存在ref时 不用 obj.key.value 去访问 直接obj.key访问
 * @param obj
 */
export function proxyRefs<T extends object>(obj: T): ShallowUnwrapRef<T> {
  return isReactive(obj) ? obj : new Proxy(obj, proxyRefsHandlers);
}
