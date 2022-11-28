import { extend, isObject, isSymbol } from './../../shared/index';
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
import { isRef } from './ref';

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

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
    if (isRef(res)) {
      return isArray(target) && isIntegerKey(key) ? res : res.value
    }

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
// has / ownKeys 是去收集依赖, deleteProperty是去触发依赖

/**
 * 判断key是否是 内置或者自定义的symbol key
 * @param target object
 * @param key 判断的key
 * @returns 
 */
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    // 不是自定义的或者内置的symbol key 就触发
    track(target, key)
  }
  return result
}

/**
 * 这个key 必须是这个对象自己的, 删除原型链上的key 是不需要trigger的
 * @param target 
 * @param key 
 */
function deleteProperty(target: object, key: symbol | string) : boolean {
  const hadKey = hasOwn(target, key);
  const result = Reflect.deleteProperty(target, key);
  if (hadKey && result) {
    trigger(target, key, undefined, (target as any)[key])
  }
  return result;
}

function ownKeys(target: object): (string | symbol)[] {
  // 触发 ownkeys Object.keys 拿不到key 的所以我们自定义一个
  track(target, 'ownKey');
  return Reflect.ownKeys(target)
}

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
  has,
  ownKeys,
  deleteProperty
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
