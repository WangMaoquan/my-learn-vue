import { isObject } from '../../shared';
import { mutableHandlers } from './baseHandler';

export const reactiveMap = new WeakMap<object, any>()

// todo Map Set 的 代理方法
const createReactiveObject = (
  target: object,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>,
) => {
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }

  // proxyMap 中取出 对应的 响应式对象
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);

  return proxy
};

export function reactive(target: object) {
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    reactiveMap
  )
}
