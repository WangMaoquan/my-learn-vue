import { CollectionTypes, shallowCollectionHandlers, shallowReadonlyCollectionHandlers, mutableCollectionHandlers, readonlyCollectionHandlers } from './collectionHandlers';
import { isObject, toRawType } from '../../shared';
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandler';
import { Ref, UnwrapRefSimple } from './ref';

export const reactiveMap = new WeakMap<Target, any>()
export const shallowReactiveMap = new WeakMap<Target, any>()
export const readonlyMap = new WeakMap<Target, any>()
export const shallowReadonlyMap = new WeakMap<Target, any>()

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive', // 约定的是响应式对象的key
  IS_READONLY = '__v_isReadonly', // 约定的是 只读对象的key
  IS_SHALLOW = '__v_isShallow', // 约定的浅包一层的key
  RAW = '__v_raw', // 约定的 返回proxy 最开始代理的那个 object 的key
  SKIP = '__v_skip',
}

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean
  [ReactiveFlags.IS_READONLY]?: boolean
  [ReactiveFlags.IS_SHALLOW]?: boolean
  [ReactiveFlags.RAW]?: any
  [ReactiveFlags.SKIP]?: boolean
}

enum TargetType  {
  INVALID = 0, // 不需要被响应式的
  COMMON = 1, // 除开map/set/weakmap/weakset
  COLLECTION = 2 // map/set/ weakmap/weakset
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}

// todo Map Set 的 代理方法
/**
 * 1. 判断是否是一个对象
 * 2. 判断传入的是否已经是一个响应式对象
 * 3. 判断该对象是否已经 在proxyMap 中存在过代理对象了
 * 4. 最后才是执行new Proxy
 * @param target 被代理对象
 * @param isReadonly 是否只读
 * @param baseHandlers 对应的proxy传入的handler 现在只有对象的
 * @param proxyMap 对应的代理map
 * @returns 
 */
const createReactiveObject = (
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  colloctionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>,
) => {
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }

  // 已经是一个proxy 直接返回
  // 不能是只读
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }

  // proxyMap 中取出 对应的 响应式对象
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const targteType = getTargetType(target);
  if (targteType === TargetType.INVALID) {
    return target;
  }

  const proxy = new Proxy(target, targteType === TargetType.COLLECTION ? colloctionHandlers : baseHandlers);
  proxyMap.set(target, proxy);

  return proxy;
};

export type UnwrapNestRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>

/**
 * 
 * @param target 传入的target
 */
export function reactive<T extends object>(target: T): UnwrapNestRefs<T>;
export function reactive(target: object) {
  // 如果传入的是一个readonly 的 直接返回就好
  if (isReadonly(target)) {
    return target
  }
  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}

type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Function | Date | Error | RegExp;

// todo set map ref promise 类型推断
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends {}
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T extends Ref<infer V> ? V
  : Readonly<T>;

export function readonly<T extends object>(target: T):DeepReadonly<T>;
export function readonly(target: object) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers ,readonlyMap);
}

export function shallowReactive<T extends object>(target: T): T;
export function shallowReactive(target: object) {
  return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap)
}

export function shallowReadonly<T extends object>(target: T): Readonly<T>
export function shallowReadonly(target: object) {
  return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers, shallowReadonlyMap)
}

export const isReactive: (value: unknown) => boolean = (value) => {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

export const isReadonly = (value: unknown) => {
  return !!(value && (value as Target)["__v_isReadonly"])
}

export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}

export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}

export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)["__v_raw"];
  return raw ? toRaw(raw) : observed;
}

export function toReactive<T>(value: T): T {
  return isObject(value) ? reactive(value) : value
}

export const toReadonly = <T extends unknown>(value: T): T =>
  isObject(value) ? readonly(value as Record<any, any>) : value