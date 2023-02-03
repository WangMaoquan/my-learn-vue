import { isArray, NOOP } from '@vue/shared';
import { ComponentInternalInstance, getComponentName } from './component';
import { callWithErrorHandling, ErrorCodes } from './errorHandling';

export interface SchedulerJob extends Function {
	id?: number; // id 后面会根据这个id 排序
	pre?: boolean; // 是否先
	active?: boolean; // 是否是激活
	computed?: boolean; // 是否是computed
	allowRecurse?: boolean; // 是否允许递归  用户没有按照单向数据流 子组件会造成父组件的更新 这样就是需要递归
	ownerInstance?: ComponentInternalInstance; // 自己当前的实例
}

export type SchedulerJobs = SchedulerJob | SchedulerJob[];

let isFlushing = false; // 判断是否在 执行更新之类的方法 中标志
let isFlushPending = false; // 判断是否 处于等待

const queue: SchedulerJob[] = []; // 存放调度job的数组
let flushIndex = 0; // 执行 queue 中对应index 的方法

const resolvedPromise = Promise.resolve() as Promise<any>; // 保存resolve方法;
let currentFlushPromise: Promise<void> | null = null; // 当前执行的promise

const pendingPostFlushCbs: SchedulerJob[] = []; // flush 为post 的
let activePostFlushCbs: SchedulerJob[] | null = null; // 当前的 post
let postFlushIndex = 0; // post 下标

const RECURSION_LIMIT = 100; // 一个job 递归的最大次数为100
type CountMap = Map<SchedulerJob, number>; // 保存 job 对应 count 的map

// 执行 queue 中job 的方法
function queueFlush() {
	if (!isFlushing && !isFlushPending) {
		isFlushPending = true; // 标记true
		currentFlushPromise = resolvedPromise.then(flushJobs);
	}
}

const getId = (job: SchedulerJob): number =>
	job.id == null ? Infinity : job.id;

const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
	return getId(a) - getId(b);
};

function checkRecursiveUpdates(seen: CountMap, fn: SchedulerJob) {
	if (!seen.has(fn)) {
		seen.set(fn, 1);
	} else {
		const count = seen.get(fn)!;
		if (count > RECURSION_LIMIT) {
			const instance = fn.ownerInstance;
			const componentName = instance && getComponentName(instance.type);
			console.warn(
				`Maximum recursive updates exceeded${
					componentName ? ` in component <${componentName}>` : ``
				}. ` +
					`This means you have a reactive effect that is mutating its own ` +
					`dependencies and thus recursively triggering itself. Possible sources ` +
					`include component template, render function, updated hook or ` +
					`watcher source function.`
			);
			return true;
		} else {
			seen.set(fn, count + 1);
		}
	}
}

function flushJobs(seen?: CountMap) {
	isFlushPending = false; // 重置 等待
	isFlushing = true; // 表示正在执行
	if (__DEV__) {
		seen = seen || new Map();
	}

	queue.sort(comparator); // id 升序排列

	// 是否超过limit
	const check = __DEV__
		? (job: SchedulerJob) => checkRecursiveUpdates(seen!, job)
		: NOOP;

	try {
		for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
			const job = queue[flushIndex];
			if (job && job.active !== false) {
				if (__DEV__ && check(job)) {
					continue;
				}
				callWithErrorHandling(job, null, ErrorCodes.SCHEDULER);
			}
		}
	} finally {
		flushIndex = 0; // 重置 index
		queue.length = 0; // 重置queue

		// flush 为post 的执行顺序在 flush 为sync后
		flushPostFlushCbs(seen);

		isFlushing = false; // 执行完了
		currentFlushPromise = null; // 重置
	}
}

const findInsertionIndex = (id: number) => {
	let start = flushIndex + 1; // 从已经开始执行的index+1 开始插入
	let end = queue.length;

	// 二分查找
	while (start < end) {
		const middle = (start + end) >>> 1;
		const middleJobId = getId(queue[middle]);
		middleJobId < id ? (start = middle + 1) : (end = middle);
	}

	return start;
};

export function queueJob(job: SchedulerJob) {
	// queue 不为空 或者 如果job循序递归 就从 flushIndex + 1, 否则 就是 flashIndex
	//  第二个判断主要应对的是, 父组件provide 一个 值, 子组件inject 拿到这个值, 然后改变, 但是此时 子组件 引发 父组件的重新更新
	if (
		!queue.length ||
		!queue.includes(
			job,
			isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
		)
	) {
		if (job.id == null) {
			queue.push(job);
		} else {
			// 保证 job.id 小的在前
			queue.splice(findInsertionIndex(job.id), 0, job);
		}
		queueFlush();
	}
}

export function nextTick<T = void>(
	this: T,
	fn?: (this: T) => void
): Promise<void> {
	const p = currentFlushPromise || resolvedPromise;
	return fn ? p.then(this ? fn.bind(this) : fn) : p;
}

export function queuePostFlushCb(cb: SchedulerJobs) {
	if (!isArray(cb)) {
		if (
			!activePostFlushCbs ||
			!activePostFlushCbs.includes(
				cb,
				cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
			)
		) {
			pendingPostFlushCbs.push(cb);
		}
	} else {
		// 只有 生命周期 函数 才会是数组
		pendingPostFlushCbs.push(...cb);
	}
	queueFlush();
}

export function flushPostFlushCbs(seen?: CountMap) {
	if (pendingPostFlushCbs.length) {
		// 去重 加 赋值
		const deduped = [...new Set(pendingPostFlushCbs)];
		// 清除 pendingCbs
		pendingPostFlushCbs.length = 0;

		// 赋值 activePostCbs
		activePostFlushCbs = deduped;
		if (__DEV__) {
			seen = seen || new Map();
		}

		// 排序
		activePostFlushCbs.sort((a, b) => getId(a) - getId(b));

		// 循环执行
		for (
			postFlushIndex = 0;
			postFlushIndex < activePostFlushCbs.length;
			postFlushIndex++
		) {
			if (
				__DEV__ &&
				checkRecursiveUpdates(seen!, activePostFlushCbs[postFlushIndex])
			) {
				continue;
			}
			activePostFlushCbs[postFlushIndex]();
		}
		// 重置 为null
		activePostFlushCbs = null;
		// 重置为0
		postFlushIndex = 0;
	}
}

export function flushPreFlushCbs(
	seen?: CountMap,
	// if currently flushing, skip the current job itself
	i = isFlushing ? flushIndex + 1 : 0
) {
	if (__DEV__) {
		seen = seen || new Map();
	}
	for (; i < queue.length; i++) {
		const cb = queue[i];
		if (cb && cb.pre) {
			if (__DEV__ && checkRecursiveUpdates(seen!, cb)) {
				continue;
			}
			queue.splice(i, 1);
			i--;
			cb();
		}
	}
}
