import { hasChanged, isArray } from 'shared/index';
import { CollectionTypes } from './collectionHandlers';
import {
	activeEffect,
	canTrackEffect,
	shouldTrack,
	trackEffects,
	triggerEffects
} from './effect';
import {
	isShallow,
	toRaw,
	toReactive,
	isReadonly,
	isReactive,
	isProxy
} from './reactive';
import type { ShallowReactiveMarker } from './reactive';
import { Dep, createDep } from './dep';

declare const RefSymbol: unique symbol;
declare const ShallowRefMarker: unique symbol;
export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true };
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
	private dep: Dep = createDep();
	private _value: T;
	private _rawValue: T;
	private readonly __v_isRef = true;
	constructor(value: T, private __v_isShallow = false) {
		// 判断value 是不是ref 再处理
		// 之前没有做这个处理 导致 typeof (ref(ref(1)).value + 1) 为 string
		this._rawValue = __v_isShallow
			? value
			: isRef<T>(value)
			? unref<T>(value)
			: toRaw(value);
		this._value = __v_isShallow
			? value
			: isRef<T>(value)
			? unref<T>(value)
			: toReactive(value);
	}
	get value() {
		if (shouldTrack && activeEffect) {
			trackEffects(this.dep);
		}
		return this._value;
	}

	set value(newValue) {
		const useDirectValue =
			this.__v_isShallow || isShallow(newValue) || isReadonly(newValue);
		newValue = useDirectValue ? newValue : toRaw(newValue);
		if (hasChanged(newValue, this._rawValue)) {
			this._rawValue = newValue;
			this._value = useDirectValue ? newValue : toReactive(newValue);
			triggerEffects(this.dep);
		}
	}
}

export function ref<T extends object>(
	value: T
): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>;
export function ref<T>(value: T): Ref<UnwrapRef<T>>;
export function ref<T = any>(): Ref<T | undefined>;
export function ref(value?: unknown) {
	return new RefImpl(value) as any;
}

export function shallowRef<T extends object>(
	value: T
): T extends Ref ? T : ShallowRef<T>;
export function shallowRef<T>(value: T): ShallowRef<T>;
export function shallowRef<T = any>(): ShallowRef<T | undefined>;
export function shallowRef(value?: unknown) {
	return new RefImpl(value, true) as any;
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
	: T extends object & { [ShallowReactiveMarker]?: never }
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
	}
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

export function triggerRef(ref: Ref) {
	triggerEffects((ref as any).dep);
}

class ObjectRefImpl<T extends object, K extends keyof T> {
	private __v_isRef = true; // 通过isRef
	constructor(
		private _object: T,
		private _key: K,
		private _defaultValue?: T[K]
	) {}

	get value() {
		const value = this._object[this._key];
		return value === undefined ? this._defaultValue : value;
	}

	set value(newValue) {
		this._object[this._key] = newValue!;
	}
}

export type ToRef<T> = [T] extends [Ref] ? T : Ref<T>;

export function toRef<T extends object, K extends keyof T>(
	target: T,
	key: K,
	defaultValue: T[K]
): ToRef<Exclude<T[K], undefined>>;
export function toRef<T extends object, K extends keyof T>(
	target: T,
	key: K
): ToRef<T[K]>;
export function toRef<T extends object, K extends keyof T>(
	target: T,
	key: K,
	defaultValue?: T[K]
) {
	// 这样写 是没办法 实现 修改reactive key的值 对应toRef 生成的ref.value 更新的
	// 原有的RefImpl 不符合我们的需求
	// 所以 我们可以新建一个 class 然后当访问 value 时返回 this.[key] 触发修改时 this.object[key] = newValue, 通过this.object 来触发proxy 的代理
	// return new RefImpl(target[key]);

	// 如果 target.key 已经是一个ref 我们是不需要 去new ObjectRefImpl的
	const value = target[key];
	return isRef(value) ? value : new ObjectRefImpl(target, key, defaultValue);
}

export type ToRefs<T = any> = {
	[K in keyof T]: ToRef<T[K]>;
};

export function toRefs<T extends object>(object: T): ToRefs<T> {
	if (__DEV__ && !isProxy(object)) {
		console.warn(
			`toRefs() expects a reactive object but received a plain one.`
		);
	}
	// 传入的是数组 就判断一下
	const res: any = isArray(object) ? [] : {};
	for (const key in object) {
		res[key] = toRef(object, key);
	}
	return res;
}

export type CustomRefFactory<T> = (
	track: () => void,
	trigger: () => void
) => {
	get: () => T;
	set: (value: T) => void;
};

class CustomRefImpl<T> {
	private dep: Dep = createDep();
	private _get: () => T;
	private _set: (value: T) => void;
	private __v_isRef = true;
	constructor(factory: CustomRefFactory<T>) {
		/**
		 * 主要的实现 构造函数里面传入 内部的 触发依赖/ 派发更新的方法
		 */
		const { get, set } = factory(
			() => {
				if (canTrackEffect()) {
					trackEffects(this.dep);
				}
			},
			() => triggerEffects(this.dep)
		);
		this._get = get;
		this._set = set;
	}

	get value() {
		return this._get();
	}

	set value(newValue) {
		this._set(newValue);
	}
}

export function customRef<T>(factory: CustomRefFactory<T>) {
	return new CustomRefImpl(factory);
}
