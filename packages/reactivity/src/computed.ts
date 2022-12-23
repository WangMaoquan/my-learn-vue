import { createDep, Dep } from './dep';
import { isFunction } from 'shared';
import {
	canTrackEffect,
	ReactiveEffect,
	trackEffects,
	triggerEffects
} from './effect';
import { ReactiveFlags, toRaw } from './reactive';
import { Ref } from './ref';

export type ComputedGetter<T> = (...args: any) => T;
export type ComputedSetter<T> = (v: T) => void;

export interface WritableComputedOptions<T> {
	get: ComputedGetter<T>;
	set: ComputedSetter<T>;
}

declare const ComputedRefSymbol: unique symbol;

export interface WritableComputedRef<T> extends Ref<T> {
	readonly effect: ReactiveEffect<T>;
}

export interface ComputedRef<T = any> extends WritableComputedRef<T> {
	readonly value: T;
	[ComputedRefSymbol]: true;
}

class ComputedRefImpl<T> {
	private _value!: T;
	public readonly effect: ReactiveEffect<T>;
	public readonly __v_isRef = true;
	public _dirty = true;
	private dep: Dep = createDep();
	public readonly [ReactiveFlags.IS_READONLY]: boolean = false;

	constructor(
		getter: ComputedGetter<T>,
		private setter: ComputedSetter<T>,
		isReadonly: boolean
	) {
		this.effect = new ReactiveEffect(getter, () => {
			if (!this._dirty) {
				this._dirty = true;
				triggerEffects(this.dep);
			}
		});
		// 说明是 computed 的effect
		this.effect.computed = true;
		this[ReactiveFlags.IS_READONLY] = isReadonly;
	}

	get value() {
		// 为啥要toRaw 如果没有toRaw 会频繁的进入proxy 的getter, 且造成赋值
		const self = toRaw(this);
		if (canTrackEffect()) {
			trackEffects(self.dep);
		}
		if (self._dirty) {
			self._dirty = false;
			self._value = self.effect.run();
		}

		return this._value;
	}

	set value(v) {
		this.setter(v);
	}
}
export function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>;
export function computed<T>(
	options: WritableComputedOptions<T>
): WritableComputedRef<T>;
export function computed<T>(
	getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>
) {
	// 需要判断是方法还是 一个对象
	// 是一个方法就只有getter, 对象的话 就存在setter/ getter
	let get: ComputedGetter<T>;
	let set: ComputedSetter<T>;

	// 如果只有回调 就是 readonly
	const onlyGetter = isFunction(getterOrOptions);
	if (onlyGetter) {
		get = getterOrOptions;
		set = () =>
			console.warn('Write operation failed: computed value is readonly');
	} else {
		get = getterOrOptions.get;
		set = getterOrOptions.set;
	}

	return new ComputedRefImpl(get, set, onlyGetter) as any;
}
