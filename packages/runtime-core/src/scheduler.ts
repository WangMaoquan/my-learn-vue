import { NOOP } from '@vue/shared';
import { ComponentInternalInstance, getComponentName } from './component';

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

const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>; // 保存resolve方法
let currentFlushPromise: Promise<void> | null = null; // 当前执行的promise

const RECURSION_LIMIT = 100; // 一个job 递归的最大次数为100
type CountMap = Map<SchedulerJob, number>; // 保存 job 对应 count 的map

// 执行 queue 中job 的方法
// @ts-ignore
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
				job();
			}
		}
	} finally {
		flushIndex = 0; // 重置 index
		queue.length = 0; // 重置queue
		isFlushing = false; // 执行完了
		currentFlushPromise = null; // 重置
	}
}
