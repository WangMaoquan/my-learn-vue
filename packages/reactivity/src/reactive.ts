import { isObject } from '../../shared';
import { mutableHandlers, readonlyHandlers } from './baseHandler';

export const reactiveMap = new WeakMap<object, any>();
export const readonlyMap = new WeakMap<object, any>();

// todo Map Set 的 代理方法
const createReactiveObject = (
  target: object,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>,
) => {
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }

  // proxyMap 中取出 对应的 响应式对象
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);

  return proxy;
};

export function reactive<T extends object>(target: T): T;
export function reactive(target: object) {
  return createReactiveObject(target, false, mutableHandlers, reactiveMap);
}

type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Function | Date | Error | RegExp;

// todo set map ref promise 类型推断
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : Readonly<T>;

export function readonly<T extends object>(target: T):DeepReadonly<T>;
export function readonly(target: object) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyMap);
}
