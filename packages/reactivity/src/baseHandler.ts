import { extend, isObject } from './../../shared/index';
import { hasChanged, hasOwn, isArray, isIntegerKey } from '../../shared';
import { warn } from '../../shared/warning';
import { track, trigger } from './effect';
import {
  ReactiveFlags,
  reactiveMap,
  readonlyMap,
  shallowReactiveMap,
  shallowReadonlyMap,
  isReactive,
  readonly,
  reactive,
} from './reactive';

/**
 * 创建 proxy get 的工厂函数
 * @param isReadonly 是否只读
 * @param shallow 是否浅 只包一层
 */
const createGetter = (isReadonly = false, shallow = false) => {
  return function get(target: object, key: string | symbol, receiver: object) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return shallow;
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      return target;
    }
    // todo 针对数组 非readonly 数组的处理
    const res = Reflect.get(target, key, receiver);

    // 只要不是只读 就会收集依赖
    if (!isReadonly) {
      track(target, key);
    }

    if (shallow) {
      return res;
    }

    // todo针对传入进来target 是 ref

    // 这里就是处理用到的时候才会去代理
    // 不像vue2初始化时 会递归defineProperty
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }

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
      trigger(target, key, value);
    } else if (hasChanged(value, oldValue)) {
      trigger(target, key, value, oldValue);
    }

    return result;
  };
};

// todo has / deleteProperty / ownKeys

// base
const get = createGetter();
const set = createSetter();

// readonly
const readonlyGet = createGetter(true);

// shallowReactive
const shallowGet = createGetter(false, true);
const shallowSet = createSetter(true);

// shallowReadonly
const shallowReadonlyGet = createGetter(false, true);

export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
};

export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target,
      );
    }
    return true;
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target,
      );
    }
    return true;
  },
};

export const shallowReactiveHandlers: ProxyHandler<object> = extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet,
  },
);

export const shallowReadonlyHandlers: ProxyHandler<object> = extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet,
  },
);
