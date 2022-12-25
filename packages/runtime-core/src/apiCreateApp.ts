import { isFunction, isObject, warn } from '@vue/shared';
import { Component, Data } from './component';
import { RootRenderFunction } from './renderer';
import { VNode } from './vnode';

/**
 * 创建app方法
 */
export type CreateAppFunction<HostElement> = (
	rootComponent: Component, // 根组件 就是我们创建项目传入的App
	rootProps?: Data | null // 属性 props
) => App<HostElement>;

/**
 * 这就是App 对象上有的
 *
 * 项目创建我们就用的了一个 mount 所以暂时就只存在一个mount
 */
export interface App<HostElement = any> {
	// todo app 剩余的属性
	mount(rootContainer: HostElement): any;
	_uid: number;
}

let uid = 0;

export function createAppAPI<HostElement>(
	render: RootRenderFunction<HostElement>
): CreateAppFunction<HostElement> {
	return function createApp(rootComponent, rootProps = null) {
		if (!isFunction(rootComponent)) {
			rootComponent = { ...rootComponent };
		}

		if (rootProps != null && !isObject(rootProps)) {
			__DEV__ && warn(`root props passed to app.mount() must be an object.`);
			rootProps = null;
		}

		let isMounted = false;

		const app: App = {
			_uid: uid++,
			mount(rootContainer: HostElement, isSVG?: boolean) {
				/**
				 * 首先我们要判断是否是已经mount了
				 * 然后我们需要调用传入进来的render 方法
				 */
				if (!isMounted) {
					// render 方法第一个参数是一个Vnode
					// 所以我们需要调用生成vnode的方法
					// todo createVnode 方法
					// const vnode = createVnode();
					const vnode = {} as VNode;

					// 调用render
					render(vnode, rootContainer, isSVG);

					// 执行完render 我们需要修改isMounted 状态
					isMounted = true;
				} else if (__DEV__) {
					warn(`App has already been mounted`);
				}
			}
		};

		return app;
	};
}
