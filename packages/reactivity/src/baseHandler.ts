import { makeMap } from '../../shared/makeMap';
import {
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  extend,
  isObject,
  isSymbol,
} from '../../shared';
import { warn } from '../../shared/warning';
import { ITERATE_KEY, track, trigger } from './effect';
import {
  ReactiveFlags,
  reactiveMap,
  readonlyMap,
  shallowReactiveMap,
  shallowReadonlyMap,
  isReactive,
  readonly,
  reactive,
  isReadonly,
  isShallow,
  toRaw,
} from './reactive';
import { isRef } from './ref';

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .filter((key) => key !== 'arguments' && key !== 'caller')
    .map((key) => (Symbol as any)[key])
    .filter(isSymbol),
);

/**
 * 那些方法会修改数组的length
 *
 * pop shift unshift push splice
 */
const createArrayInstrumentations = () => {
  const changeArrayLengthFunc = [
    'pop',
    'shift',
    'unshift',
    'push',
    'splice',
  ] as const;
  const instrumentations: Record<string, Function> = {};

  changeArrayLengthFunc.forEach((key) => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const res = (toRaw(this) as any)[key].apply(this, args);
      return res;
    };
  });

  return instrumentations;
};

const arrayInstrumentations = createArrayInstrumentations();

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

    const targetIsArray = isArray(target);

    if (!isReadonly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }
    }

    // todo 针对数组 非readonly 数组的处理
    const res = Reflect.get(target, key, receiver);

    // 增加对symbol 的处理 没有这层处理的话 会访问不到symbol的, 当然如果下面的条件 也都没通过 也可以访问哈哈哈
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    // 只要不是只读 就会收集依赖
    if (!isReadonly) {
      track(target, key);
    }

    if (shallow) {
      return res;
    }

    // todo针对传入进来target 是 ref
    if (isRef(res)) {
      return isArray(target) && isIntegerKey(key) ? res : res.value;
    }

    // 这里就是处理用到的时候才会去代理
    // 不像vue2初始化时 会递归defineProperty
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  };
};

const createSetter = (shallow = false) => {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object,
  ) {
    // 取出旧值
    let oldValue = (target as any)[key];

    // 如果是 computed 且回调传入的 是一个getter 会进入这里
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false;
    }

    if (!shallow) {
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue);
        value = toRaw(value);
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
    }

    // 判断 是否存在该 key
    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);

    // 这里判断 是否是继承来的
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, key, value, oldValue);
      }
    }

    // todo  deal ref

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
  const result = Reflect.has(target, key);
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    // 不是自定义的或者内置的symbol key 就触发
    track(target, key);
  }
  return result;
}

/**
 * 这个key 必须是这个对象自己的, 删除原型链上的key 是不需要trigger的
 * @param target
 * @param key
 */
function deleteProperty(target: object, key: symbol | string): boolean {
  const hadKey = hasOwn(target, key);
  const result = Reflect.deleteProperty(target, key);
  if (hadKey && result) {
    trigger(target, key, undefined, (target as any)[key]);
  }
  return result;
}

function ownKeys(target: object): (string | symbol)[] {
  // 触发 ownkeys Object.keys 拿不到key 的所以我们自定义一个
  track(target, isArray(target) ? 'length' : ITERATE_KEY);
  return Reflect.ownKeys(target);
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
  deleteProperty,
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
