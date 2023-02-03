import { VNode } from './vnode';
import { ComponentInternalInstance } from './component';
import { isPromise, isFunction } from '@vue/shared';
import { LifecycleHooks } from './enums';

export const enum ErrorCodes {
	SETUP_FUNCTION, // setup
	RENDER_FUNCTION, // render
	WATCH_GETTER, // watch
	WATCH_CALLBACK, // watch 回调
	WATCH_CLEANUP, // 关闭watch 清除的回调
	VNODE_HOOK, // vnode的相关hook
	APP_ERROR_HANDLER, // app 收集错误方法
	APP_WARN_HANDLER, // app 警告的方法
	SCHEDULER // 调度
}

export const ErrorTypeStrings: Record<LifecycleHooks | ErrorCodes, string> = {
	[LifecycleHooks.SERVER_PREFETCH]: 'serverPrefetch hook',
	[LifecycleHooks.BEFORE_CREATE]: 'beforeCreate hook',
	[LifecycleHooks.CREATED]: 'created hook',
	[LifecycleHooks.BEFORE_MOUNT]: 'beforeMount hook',
	[LifecycleHooks.MOUNTED]: 'mounted hook',
	[LifecycleHooks.BEFORE_UPDATE]: 'beforeUpdate hook',
	[LifecycleHooks.UPDATED]: 'updated',
	[LifecycleHooks.BEFORE_UNMOUNT]: 'beforeUnmount hook',
	[LifecycleHooks.UNMOUNTED]: 'unmounted hook',
	[LifecycleHooks.ACTIVATED]: 'activated hook',
	[LifecycleHooks.DEACTIVATED]: 'deactivated hook',
	[LifecycleHooks.ERROR_CAPTURED]: 'errorCaptured hook',
	[LifecycleHooks.RENDER_TRACKED]: 'renderTracked hook',
	[LifecycleHooks.RENDER_TRIGGERED]: 'renderTriggered hook',
	[ErrorCodes.SETUP_FUNCTION]: 'setup function',
	[ErrorCodes.RENDER_FUNCTION]: 'render function',
	[ErrorCodes.WATCH_GETTER]: 'watcher getter',
	[ErrorCodes.WATCH_CALLBACK]: 'watcher callback',
	[ErrorCodes.WATCH_CLEANUP]: 'watcher cleanup function',
	[ErrorCodes.VNODE_HOOK]: 'vnode hook',
	[ErrorCodes.APP_ERROR_HANDLER]: 'app errorHandler',
	[ErrorCodes.APP_WARN_HANDLER]: 'app warnHandler',
	[ErrorCodes.SCHEDULER]:
		'scheduler flush. This is likely a Vue internals bug. ' +
		'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/core'
};

export type ErrorTypes = LifecycleHooks | ErrorCodes;

export function callWithErrorHandling(
	fn: Function,
	instance: ComponentInternalInstance | null,
	type: ErrorTypes,
	args?: unknown[]
) {
	let res;
	try {
		res = args ? fn(...args) : fn();
	} catch (err) {
		handleError(err, instance, type);
	}
	return res;
}

export function callWithAsyncErrorHandling(
	fn: Function | Function[],
	instance: ComponentInternalInstance | null,
	type: ErrorTypes,
	args?: unknown[]
): any[] {
	if (isFunction(fn)) {
		const res = callWithErrorHandling(fn, instance, type, args);
		if (res && isPromise(res)) {
			res.catch((err) => {
				handleError(err, instance, type);
			});
		}
		return res;
	}

	const values = [];
	for (let i = 0; i < fn.length; i++) {
		values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
	}
	return values;
}

export function handleError(
	err: unknown,
	instance: ComponentInternalInstance | null,
	type: ErrorTypes
) {
	if (instance) {
		const exposedInstance = instance.proxy;
		const errorInfo = __DEV__ ? ErrorTypeStrings[type] : type;
		// 获取用户自定义的 handler
		const appErrorHandler = instance.appContext.config.errorHandler;
		if (appErrorHandler) {
			callWithErrorHandling(
				appErrorHandler,
				null,
				ErrorCodes.APP_ERROR_HANDLER,
				[err, exposedInstance, errorInfo]
			);
			return;
		}
	}
	logError(err, type);
}

function logError(err: unknown, type: ErrorTypes) {
	if (__DEV__) {
		const info = ErrorTypeStrings[type];
		console.warn(
			`Unhandled error${info ? ` during execution of ${info}` : ``}`
		);
	} else {
		console.error(err);
	}
}
