import { capitalize, hasChanged, hasOwn, toRawType } from '@vue/shared';
import { ITERATE_KEY, track, trigger } from './effect';
import { TriggerOpTypes } from './operations';
import {
	ReactiveFlags,
	toRaw,
	Target,
	toReactive,
	toReadonly
} from './reactive';
export type CollectionTypes = IterableCollections | WeakCollections;

// Map 和 Set 是实现了 Symbol.iterator 所以搞了一个新的type
type IterableCollections = Map<any, any> | Set<any>;

// weakMap/weakSet 作为一个新的type
type WeakCollections = WeakMap<any, any> | WeakSet<any>;

type MapTypes = Map<any, any> | WeakMap<any, any>;
type SetTypes = Set<any> | WeakSet<any>;

const getProto = <T extends CollectionTypes>(v: T): any =>
	Reflect.getPrototypeOf(v);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const toShallow = <T extends unknown>(value: T): T => value;

/**
 * 注意set/weakSet/map/weakMap 执行新增的操作时 如果传入的是一个reactiveObject 只会将这个reactiveObject的 代理的原始target 添加进去
 */

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
	isShallow = false
) => {
	target = (target as Target)[ReactiveFlags.RAW];
	// 不取raw object 会导致栈爆炸
	const rawTarget = toRaw(target);
	const rawKey = toRaw(key);
	// 判断是否是 只读, 不是只读就需要 track
	if (!isReadonly) {
		// 收集依赖
		if (key !== rawKey) {
			track(rawTarget, key);
		}
		track(target, rawKey);
	}
	const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
	return wrap(target.get(key));
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
}

function has(this: CollectionTypes, key: unknown, isReadonly = false) {
	const target = (this as Target)[ReactiveFlags.RAW];
	const rawTarget = toRaw(target);
	const rawKey = toRaw(key);
	if (!isReadonly) {
		if (key !== rawKey) {
			track(rawTarget, key);
		}
		track(target, rawKey);
	}
	return rawKey === key ? target.has(key) : target.has(rawKey);
}

/**
 * set/ weakset
 * 1. 保证是target 是原始的target
 * 2. 通过原型链拿到 has 方法
 * 3. 保证value 是原始value
 * 4. 判断是否有改值
 * 5. 将原始的value add 进原始对象, 并派发更新
 * 6. 返回this 链式调用
 * @param this
 * @param value
 * @returns
 */
function add(this: SetTypes, value: unknown) {
	const target = toRaw(this);
	const { has } = getProto(target);
	value = toRaw(value);
	const hadKey = has.call(target, value);
	if (!hadKey) {
		target.add(value);
		trigger(target, value);
	}
	return this;
}

/**
 * 1. 获取原始对象
 * 2. 拿到has/get(set 无)
 * 3. 判断是否有该key/value
 * 4. 执行delete
 * 5. 删除成功再去派发更新
 * 6. 返回this
 * @param this
 * @param key
 * @returns
 */
function deleteEntry(this: CollectionTypes, key: unknown) {
	const target = toRaw(this);
	const { has, get } = getProto(target);
	let hadKey = has.call(target, key);
	if (!hadKey) {
		key = toRaw(key);
		hadKey = has.call(target, key);
	} else {
		checkIdentityKeys(target, has, key);
	}

	// 因为  set 是没有get的
	const oldValue = get ? get.call(target, key) : undefined;
	const result = target.delete(key);
	if (hadKey) {
		trigger(target, key, undefined, oldValue);
	}
	return result;
}

function size(target: CollectionTypes, isReadonly = false) {
	target = toRaw(target);
	!isReadonly && track(target, ITERATE_KEY);
	return Reflect.get(target, 'size', target);
}

// readonly 的set / add / delete /clear  都只需要给出警告的 只是处理类型不同而已
function createReadonlyMethod(type: TriggerOpTypes) {
	return function (this: CollectionTypes, ...args: unknown[]) {
		if (__DEV__) {
			const key = args[0] ? `on key "${args[0]}" ` : ``;
			console.warn(
				`${capitalize(type)} operation ${key}failed: target is readonly.`,
				toRaw(this)
			);
		}
		return type === TriggerOpTypes.DELETE ? false : this;
	};
}

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
	isShallow: boolean
) => {
	return (
		target: CollectionTypes,
		key: string | symbol,
		reciver: CollectionTypes
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
		return Reflect.get(
			// 因为没有加下面这个判断 导致 获取map/set的类型时 一直调用的 是instrumentation 这个的 然后测例跑不通
			hasOwn(instrumentation, key) && key in target ? instrumentation : target,
			key,
			reciver
		);
	};
};

const createInstrumentations = () => {
	const mutableInstrumentions: Record<string, Function> = {
		get(this: MapTypes, key: unknown) {
			return get(this, key);
		},
		get size() {
			return size(this as unknown as IterableCollections);
		},
		set,
		has,
		add,
		delete: deleteEntry
	};

	const shallowInstrumentions: Record<string, Function> = {
		get(this: MapTypes, key: unknown) {
			return get(this, key, false, true);
		},
		get size() {
			return size(this as unknown as IterableCollections);
		},
		set,
		has,
		add,
		delete: deleteEntry
	};

	const readonlyInstrumentions: Record<string, Function> = {
		get(this: MapTypes, key: unknown) {
			return get(this, key, true, false);
		},
		get size() {
			return size(this as unknown as IterableCollections, true);
		},
		set: createReadonlyMethod(TriggerOpTypes.SET),
		has(this: MapTypes, key: unknown) {
			return has.call(this, key, true);
		},
		add: createReadonlyMethod(TriggerOpTypes.ADD),
		delete: createReadonlyMethod(TriggerOpTypes.DELETE),
		clear: createReadonlyMethod(TriggerOpTypes.CLEAR)
	};

	const shallowReadonlyInstrumentions: Record<string, Function> = {
		get(this: MapTypes, key: unknown) {
			return get(this, key, true, true);
		},
		has(this: MapTypes, key: unknown) {
			return has.call(this, key, true);
		},
		get size() {
			return size(this as unknown as IterableCollections, true);
		},
		set: createReadonlyMethod(TriggerOpTypes.SET),
		add: createReadonlyMethod(TriggerOpTypes.ADD),
		delete: createReadonlyMethod(TriggerOpTypes.DELETE),
		clear: createReadonlyMethod(TriggerOpTypes.CLEAR)
	};

	return [
		mutableInstrumentions,
		shallowInstrumentions,
		readonlyInstrumentions,
		shallowReadonlyInstrumentions
	];
};

const [
	mutableInstrumentions,
	shallowInstrumentions,
	readonlyInstrumentions,
	shallowReadonlyInstrumentions
] = createInstrumentations();

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
	get: createInstrumentationGetter(false, false)
};
export const shallowCollectionHandlers: ProxyHandler<CollectionTypes> = {
	get: createInstrumentationGetter(false, true)
};
export const readonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
	get: createInstrumentationGetter(true, false)
};
export const shallowReadonlyCollectionHandlers: ProxyHandler<CollectionTypes> =
	{
		get: createInstrumentationGetter(true, true)
	};

function checkIdentityKeys(
	target: CollectionTypes,
	has: (key: unknown) => boolean,
	key: unknown
) {
	const rawKey = toRaw(key);
	if (rawKey !== key && has.call(target, rawKey)) {
		const type = toRawType(target);
		console.warn(
			`Reactive ${type} contains both the raw and reactive ` +
				`versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
				`which can lead to inconsistencies. ` +
				`Avoid differentiating between the raw and reactive versions ` +
				`of an object and only use the reactive version if possible.`
		);
	}
}
