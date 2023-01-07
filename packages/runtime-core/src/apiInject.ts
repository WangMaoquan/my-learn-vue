import { isFunction } from '@vue/shared';
import { currentInstance } from './component';
import { currentRenderingInstance } from './componentRenderContext';

export interface InjectionKey<T> extends Symbol {}

/**
 * 原理是通过 原型链 上的 provides 去寻找 key
 */
export function provide<T>(key: InjectionKey<T> | string | number, value: T) {
	if (!currentInstance) {
		if (__DEV__) {
			console.warn(`provide() can only be used inside setup().`);
		}
	} else {
		// 取出当前实例的 provides
		let provides = currentInstance.provides;
		// 拿到父级的 provides
		const parentProvides =
			currentInstance.parent && currentInstance.parent.provides;
		/**
		 * 首先我们要明白 currentInstance.provides 其实访问的 appContext.provides
		 * 我们创建子组件的实例时(createComponentInstance 这个方法), 判断的是 如果存在parent,
		 * 就把 parent.appContext 赋值给子组件的 appContext
		 * 所以如果 当我们执行 子组件的setup 时, 如果里面调用了 provide, 其实这是provide 就是 parent上的provide
		 * 然后我们provide 的原理就是原型链 查找, 我们是不是需要 重新赋值 当前实例的provides,
		 * 所以才有下面的这个判断
		 * 保证的是 自己组件注册的key, 不会找到原型链上去
		 */
		if (parentProvides === provides) {
			provides = currentInstance.provides = Object.create(parentProvides);
		}
		provides[key as string] = value;
	}
}

export function inject<T>(key: InjectionKey<T> | string): T | undefined;
export function inject<T>(
	key: InjectionKey<T> | string,
	defaultValue: T,
	treatDefaultAsFactory?: false
): T;
export function inject<T>(
	key: InjectionKey<T> | string,
	defaultValue: T | (() => T),
	treatDefaultAsFactory: true
): T;
export function inject(
	key: InjectionKey<any> | string,
	defaultValue?: unknown,
	treatDefaultAsFactory = false
) {
	const instance = currentInstance || currentRenderingInstance;
	if (instance) {
		// parent wei null 只能是根组件 App
		const provides =
			instance.parent == null
				? instance.vnode.appContext && instance.vnode.appContext.provides
				: instance.parent.provides;

		if (provides && (key as string | symbol) in provides) {
			return provides[key as string];
		} else if (arguments.length > 1) {
			return treatDefaultAsFactory && isFunction(defaultValue)
				? defaultValue.call(instance.proxy)
				: defaultValue;
		} else if (__DEV__) {
			console.warn(`injection "${String(key)}" not found.`);
		}
	} else if (__DEV__) {
		console.warn(
			`inject() can only be used inside setup() or functional components.`
		);
	}
}
