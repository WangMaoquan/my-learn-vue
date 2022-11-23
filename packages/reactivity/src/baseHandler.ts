import { hasChanged, hasOwn, isArray, isIntegerKey } from '../../shared';
import { track, trigger } from './effect';

/**
 * 创建 proxy get 的工厂函数
 * @param isReadonly 是否只读
 * @param isShallow 是否浅 只包一层
 */
const createGetter = (isReadonly = false, isShallow = false) => {
  return function get(target: object, key: string | symbol, receiver: object) {
    // todo vue3 reactiveObject 定义的属性未处理
    // todo 针对数组 非readonly 数组的处理
    const res = Reflect.get(target, key, receiver);

    if (!isReadonly) {
      track(target, key);
    }

    // todo针对传入进来target 是 ref 或者已经是reactiveoject 情况下的处理

    return res;
  };
};

const createSetter = (isShallow = false) => {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object,
  ) {
    // 取出旧值
    let oldValue = (target as any)[key];

    // 判断 是否存在该 key
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);

    if (!hadKey) {
      trigger(target, key, value)
    } else if (hasChanged(value, oldValue)) {
      trigger(target, key, value, oldValue)
    }

    return result;
  };
};

// todo has / deleteProperty / ownKeys

const get = createGetter();
const set = createSetter();

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
}