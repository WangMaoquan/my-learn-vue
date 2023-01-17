import {
	isRef,
	ReactiveEffect,
	Ref,
	ReactiveFlags,
	isReactive,
	EffectScheduler
} from '@vue/reactivity';
import {
	EMPTY_OBJ,
	isFunction,
	hasChanged,
	NOOP,
	isArray,
	isSet,
	isMap,
	isPlainObject
} from '@vue/shared';
import { ComputedRef } from 'packages/reactivity/src/computed';
import { currentInstance } from './component';
import { queueJob, queuePostFlushCb } from './scheduler';

// 初始值
const INITIAL_WATCHER_VALUE = {};

type OnCleanup = (cleanupFn: () => void) => void;

export interface WatchOptionsBase {
	flush?: 'pre' | 'post' | 'sync'; // 调度
}

export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
	immediate?: Immediate; // 是否立即执行
	deep?: boolean; // 是否深度监听
}

export type WatchEffect = (onCleanup: OnCleanup) => void;

// watch 第一个参数
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);

export type WatchCallback<V = any, OV = any> = (
	value: V,
	oldValue: OV,
	onCleanup: OnCleanup
) => any;

export type WatchStopHandle = () => void;

export function watchEffect(
	effect: WatchEffect,
	options?: WatchOptionsBase
): WatchStopHandle {
	return doWatch(effect, null, options);
}

// ref, compunted
export function watch<T, Immediate extends Readonly<boolean> = false>(
	source: WatchSource<T>,
	cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
	options?: WatchOptions<Immediate>
): WatchStopHandle;

// reactive
export function watch<
	T extends object,
	Immediate extends Readonly<boolean> = false
>(
	source: T,
	cb: WatchCallback<T, Immediate extends true ? T | undefined : T>,
	options?: WatchOptions<Immediate>
): WatchStopHandle;

// 实现
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
	source: T | WatchSource<T>,
	cb: any,
	options?: WatchOptions<Immediate>
): WatchStopHandle {
	return doWatch(source as any, cb, options);
}

const doWatch = (
	source: WatchSource | WatchEffect | object,
	cb: WatchCallback | null,
	{ immediate, deep, flush }: WatchOptions = EMPTY_OBJ
) => {
	/**
	 * 依赖发生变化 调用 fn, 是不是 ReactiveEffect 的功能
	 * 所以我们只需要 怎么去构造fn, 已经 scheduler
	 *
	 * 先分析 这个 fn 的功能, 要能被 对应的响应式对象 收集 => 怎么收集呢 =>  track 收集 => getter
	 * 所以 这个 fn 只需要 触发 响应式对象的 getter
	 *
	 * scheduler 就根据 options 去生成
	 */

	// 处理非法的source
	const warnInvalidSource = (s: unknown) => {
		console.warn(
			`Invalid watch source: `,
			s,
			`A watch source can only be a getter/effect function, a ref, ` +
				`a reactive object, or an array of these types.`
		);
	};
	const instance = currentInstance;

	let getter: () => any;

	if (isRef(source)) {
		// 处理ref
		getter = () => source.value;
	} else if (isReactive(source)) {
		// 处理reactive
		getter = () => source;
		deep = true;
	} else if (isFunction(source)) {
		// 处理 () => x.value | () => reactiveObj.xx

		if (cb) {
			getter = () => (source as () => any)();
		} else {
			getter = () => {
				if (instance && instance.isUnmounted) {
					return;
				}
				if (cleanup) {
					cleanup();
				}
				return source(onCleanup);
			};
		}
	} else {
		getter = NOOP;
		__DEV__ && warnInvalidSource(source);
	}

	if (cb && deep) {
		// deep 需要深度监听 也即是我们还要把 对象里面的key 都要收集依赖
		const baseGetter = getter;
		getter = () => traverse(baseGetter());
	}

	let cleanup: () => void;
	let onCleanup: OnCleanup = (fn: () => void) => {
		// onCleanup 原理就是 在执行 effect.stop时 触发 onStop
		cleanup = effect.onStop = () => {
			fn();
		};
	};
	// 传给 cb 值
	let oldValue: any = INITIAL_WATCHER_VALUE;
	const job = () => {
		// effect 是否被 停止
		if (!effect.active) {
			return;
		}
		if (cb) {
			// 获取最新的值
			const newValue = effect.run();
			// 深度监听 或者 值发生变化
			if (deep || hasChanged(newValue, oldValue)) {
				// 执行cb
				cb(
					newValue,
					oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
					onCleanup
				);
			}
			// 记得将newValue 赋值给 oldValue
			oldValue = newValue;
		} else {
			effect.run();
		}
	};

	let scheduler: EffectScheduler;
	if (flush === 'sync') {
		scheduler = job as any;
	} else if (flush === 'post') {
		scheduler = () => queuePostFlushCb(job);
	} else {
		// todo pre
		job.pre = true;
		if (instance) job.id = instance.uid;
		scheduler = () => queueJob(job);
	}

	const effect = new ReactiveEffect(getter!, scheduler!);

	// init 执行 cb
	if (cb) {
		if (immediate) {
			job();
		} else {
			oldValue = effect.run();
		}
	} else {
		effect.run();
	}

	// 生成 stop的方法
	const stopWatch = () => {
		effect.stop();
	};

	return stopWatch;
};

// 遍历 对象的 方法, seem 保存每个value 的set
const traverse = (value: unknown, seen?: Set<unknown>) => {
	if (!isReactive(value) || (value as any)[ReactiveFlags.SKIP]) {
		return value;
	}
	seen = seen || new Set();
	if (seen.has(value)) {
		return value;
	}
	seen.add(value);

	if (isRef(value)) {
		// 处理ref 通过value.value 触发track
		traverse(value.value, seen);
	} else if (isArray(value)) {
		// 处理数组
		for (let i = 0; i < value.length; i++) {
			traverse(value[i], seen);
		}
	} else if (isSet(value) || isMap(value)) {
		// 处理 map set
		value.forEach((v: any) => {
			traverse(v, seen);
		});
	} else if (isPlainObject(value)) {
		// 处理 object
		for (const key in value) {
			traverse((value as any)[key], seen);
		}
	}
	return value;
};
