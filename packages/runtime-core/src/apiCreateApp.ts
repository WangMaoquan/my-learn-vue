import { isFunction, isObject, warn } from '@vue/shared';
import { InjectionKey } from './apiInject';
import {
	Component,
	ComponentInternalInstance,
	ConcreteComponent,
	Data
} from './component';
import { ComponentOptions } from './componentOptions';
import { ComponentPublicInstance } from './componentPublicInstance';
import { Directive } from './directives';
import { RootRenderFunction } from './renderer';
import { VNode } from './vnode';

/**
 * 创建app方法
 */
export type CreateAppFunction<HostElement> = (
	rootComponent: Component, // 根组件 就是我们创建项目传入的App
	rootProps?: Data | null // 属性 props
) => App<HostElement>;

export interface AppConfig {
	// 全局方法/属性的存放处
	globalProperties: Record<string, any>;

	// 是否是 自定义元素的方法 比如 (tag) => tag.startWith('d-') 这样d- 开头的就是我们自定义的
	isCustomElement?: (tag: string) => boolean;
}

/**
 * 都知道要注册vue的插件 必须有个 install 的方法,
 * 这个install 方法 第一个参数 在 2.x 的时候是 Vue, 后面参数就是配置
 * 那么在3.x 这第一个参数就应该是我们App
 */
type PluginInstallFunction<Options> = Options extends unknown[]
	? (app: App, ...options: Options) => any
	: (app: App, options: Options) => any;

/**
 * 反正必须包含一个 install 方法
 */
export type Plugin<Options = any[]> =
	| (PluginInstallFunction<Options> & {
			install?: PluginInstallFunction<Options>;
	  })
	| {
			install: PluginInstallFunction<Options>;
	  };

/**
 * 全局的上下文
 */
export interface AppContext {
	app: App; // 当前的app
	config: AppConfig; // 全局配置
	mixins: ComponentOptions[]; // 混入的配置
	components: Record<string, Component>; // 全局组件
	directives: Record<string, Directive>; // 全局指令
	provides: Record<string | symbol, any>; // 全局的注入
	filters?: Record<string, Function>; // filter 方法
}

/**
 * 这就是App 对象上有的
 *
 * 项目创建我们就用的了一个 mount 所以暂时就只存在一个mount
 */
export interface App<HostElement = any> {
	// todo app 剩余的属性
	mount(rootContainer: HostElement, isSVG?: boolean): ComponentPublicInstance;
	// app 的uid 标识
	_uid: number;
	// vue2.x 我们写的通用方法是挂载在原型链上的, vue3 我们是放在 config的globalProperties里面
	config: AppConfig;
	// use 方法重载, 注册vue 插件的方法
	use<Options extends unknown[]>(
		plugin: Plugin<Options>,
		...options: Options
	): this;
	use<Options>(plugin: Plugin<Options>, options: Options): this;
	// 混入的方法
	mixin(mixin: ComponentOptions): this;
	// 注册全局组件 或者 根据组件名 返回注册的组件的方法
	component(name: string): Component | undefined;
	component(name: string, component: Component): this;
	// 注册全局指令 或者 根据指令名 返回注册的指令的方法
	directive(name: string): Directive | undefined;
	directive(name: string, directive: Directive): this;
	// 卸载组件的方法
	unmount(): void;
	// 垮组件传递 的provide方法
	provide<T>(key: InjectionKey<T> | string, value: T): this;
	// 对应的组件
	_component: ConcreteComponent;
	// 保存的props 属性
	_props: Data | null;
	// 对应的真实dom
	_container: HostElement | null;
	// 全局上下文
	_context: AppContext;
	// 实例
	_instance: ComponentInternalInstance | null;
	// 注册全局filter 或者 根据filter名 返回注册的filter的方法
	filter?(name: string): Function | undefined;
	filter?(name: string, filter: Function): this;
}

let uid = 0;

export function createAppAPI<HostElement>(
	render: RootRenderFunction<HostElement>
): CreateAppFunction<HostElement> {
	return function createApp(rootComponent, rootProps = null) {
		// 如果不是functionComponent
		if (!isFunction(rootComponent)) {
			rootComponent = { ...rootComponent };
		}
		// rootProps 必须是一个对象
		if (rootProps != null && !isObject(rootProps)) {
			__DEV__ && warn(`root props passed to app.mount() must be an object.`);
			rootProps = null;
		}

		// 初始化isMounted
		let isMounted = false;

		const app: App = {
			_uid: uid++,
			_component: rootComponent as ConcreteComponent,
			_props: rootProps,
			_instance: null,
			_container: null,

			mount(rootContainer: HostElement, isSVG?: boolean): any {
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
					return {};
				} else if (__DEV__) {
					warn(`App has already been mounted`);
				}
			}
		};

		return app;
	};
}
