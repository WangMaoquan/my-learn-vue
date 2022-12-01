import { hasChanged, toRawType } from '../../shared';
import { track, trigger } from './effect';
import { ReactiveFlags, toRaw, Target, toReactive, toReadonly } from './reactive';
export type CollectionTypes = IterableCollections | WeakCollections;

// Map 和 Set 是实现了 Symbol.iterator 所以搞了一个新的type
type IterableCollections = Map<any, any> | Set<any>;

// weakMap/weakSet 作为一个新的type
type WeakCollections = WeakMap<any, any> | WeakSet<any>;

type MapTypes = Map<any, any> | WeakMap<any, any>;
type SetTypes = Set<any> | WeakSet<any>;

const getProto = <T extends CollectionTypes>(v: T): any =>
  Reflect.getPrototypeOf(v);

  const toShallow = <T extends unknown>(value: T): T => value

/**
 * 除了 target 和 key 外我们也要注意是否是只读 是否是 浅包一层
 *
 * @param target
 * @param key
 * @param isReadonly
 * @param isShallow
 */
const get = (
  target: MapTypes,
  key: unknown,
  isReadonly = false,
  isShallow = false,
) => {
  target = (target as Target)[ReactiveFlags.RAW];
  // 不取raw object 会导致栈爆炸
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  // 判断是否是 只读, 不是只读就需要 track
  if (!isReadonly) {
    // 收集依赖
    if (key !== rawKey) {
      track(rawTarget, key)
    }
    track(target, rawKey);
  }
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
  return wrap(target.get(key))
};

function set(this: MapTypes, key: unknown, value: unknown) {
  // set 的时候是需要判断是否存在该 key 的, 我们只需要调用has 方法就行 但是我们要注意 target 可能不是一个map/WeakMap, 所以我们需要toRaw
  const rawTarget = toRaw(this);
  value = toRaw(value);

  // 取出原型链上的 has get
  const { has, get } = getProto(rawTarget);

  let hadKey = has.call(rawTarget, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(rawTarget, key);
  } else if (__DEV__) {
    checkIdentityKeys(rawTarget, has, key);
  }

  const oldValue = get.call(rawTarget, key);
  rawTarget.set(key, value);

  if (!hadKey) {
    trigger(rawTarget, key, value);
  } else if (hasChanged(value, oldValue)) {
    trigger(rawTarget, key, value, oldValue);
  }

  return this;
};

/**
 * 我们首先 要明白 map.get/set, set.add/has 的这个dot 其实是访问的 get
 * 所以我们只需要 自定一个get 然后拿到key (set/ has)调用Reflect.get(target, key) 去走我们自定义的逻辑
 * 其次要分清楚map/set 和 WeakMap/WeakSet 之间的区别 然后才好去处理
 * map / WeakMap 他们之间都有的方法 => get, has ,delete, set,
 * set / WeakSet  => add, delete, has
 * 我们先实现共有的
 */

// 对于 map/set/weakMap/weakSet 我们的handle 里面只要get, 所以我们只需要一个创建返回get 的方法
// instrumentation 有植入的意思
const createInstrumentationGetter = (
  isReadonly: boolean,
  isShallow: boolean,
) => {
  return (
    target: CollectionTypes,
    key: string | symbol,
    reciver: CollectionTypes,
  ) => {
    // 老规矩先判断 ReactiveFlag
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
    } else if (key === ReactiveFlags.RAW) {
      return target;
    }

    // 然后就是调用我们自己的 set/add/has 这一趴啦方法
    // 我们只需要传入 我们包装好的{set, add, has, ...} 这样的一个对象,到Reflect.get的一个参数就好了
    // todo 这里的instrumention 是还要根据 isReadonly/isShallow 来赋值的 我们需要创建一个方法来生成这样的四个对象
    const instrumentation = isShallow
      ? isReadonly
        ? shallowReadonlyInstrumentions
        : shallowInstrumentions
      : isReadonly
      ? readonlyInstrumentions
      : mutableInstrumentions;
    return Reflect.get(instrumentation, key, reciver);
  };
};

const createInstrumentations = () => {
  const mutableInstrumentions: Record<string, Function> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key);
    },
    set,
  };

  const shallowInstrumentions: Record<string, Function> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key, false, true);
    },
    set,
  };

  const readonlyInstrumentions: Record<string, Function> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key, true, false);
    },
  };

  const shallowReadonlyInstrumentions: Record<string, Function> = {
    get(this: MapTypes, key: unknown) {
      return get(this, key, true, true);
    },
  };

  return [
    mutableInstrumentions,
    shallowInstrumentions,
    readonlyInstrumentions,
    shallowReadonlyInstrumentions,
  ];
};

const [
  mutableInstrumentions,
  shallowInstrumentions,
  readonlyInstrumentions,
  shallowReadonlyInstrumentions,
] = createInstrumentations();

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(false, false),
};
export const shallowCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(false, true),
};
export const readonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(true, false),
};
export const shallowReadonlyCollectionHandlers: ProxyHandler<CollectionTypes> =
  {
    get: createInstrumentationGetter(true, true),
  };

function checkIdentityKeys(
  target: CollectionTypes,
  has: (key: unknown) => boolean,
  key: unknown,
) {
  const rawKey = toRaw(key);
  if (rawKey !== key && has.call(target, rawKey)) {
    const type = toRawType(target);
    console.warn(
      `Reactive ${type} contains both the raw and reactive ` +
        `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
        `which can lead to inconsistencies. ` +
        `Avoid differentiating between the raw and reactive versions ` +
        `of an object and only use the reactive version if possible.`,
    );
  }
}
