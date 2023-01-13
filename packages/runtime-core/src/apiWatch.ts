import { isReactive } from './../../reactivity/src/reactive';
import { isRef, ReactiveEffect, Ref } from '@vue/reactivity';
import { EMPTY_OBJ, isFunction } from '@vue/shared';
import { ComputedRef } from 'packages/reactivity/src/computed';
import { currentInstance } from './component';

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
	}

	let cleanup: () => void;
	let onCleanup: OnCleanup = (fn: () => void) => {
		// onCleanup 原理就是 在执行 effect.stop时 触发 onStop
		cleanup = effect.onStop = () => {
			fn();
		};
	};

	const job = () => {};

	const effect = new ReactiveEffect(getter!, job);

	// init 执行 cb
	if (cb) {
		if (immediate) {
			job();
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
