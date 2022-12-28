import {
	markRaw,
	track,
	ReactiveEffect,
	shallowReadonly
} from '@vue/reactivity';
import { EMPTY_OBJ, isFunction, makeMap, NO, ShapeFlags } from '@vue/shared';
import { AppConfig, AppContext, createAppContext } from './apiCreateApp';
import { emit, EmitsOptions, ObjectEmitsOptions } from './componentEmits';
import { ComponentOptions } from './componentOptions';
import { initProps, NormalizedPropsOptions } from './componentProps';
import {
	ComponentPublicInstance,
	exposePropsOnRenderContext,
	PublicInstanceProxyHandlers
} from './componentPublicInstance';
import { markAttrsAccessed } from './componentRenderUtils';
import { InternalSlots, Slots } from './componentSlots';
import { Directive, validateDirectiveName } from './directives';
import { SchedulerJob } from './scheduler';
import { VNode } from './vnode';

export type Data = Record<string, unknown>;
export interface Component {}
export type ConcreteComponent<Props = {}, RawBindings = any> = ComponentOptions<
	Props,
	RawBindings
>;

export interface ComponentInternalInstance {
	uid: number; // 标识符
	type: ConcreteComponent; // 组件的type
	parent: ComponentInternalInstance | null; // 父级
	root: ComponentInternalInstance; // 自己的
	appContext: AppContext; // app 上下文
	vnode: VNode; // 自己的vnode
	next: VNode | null; // 更新时生成的vnode
	subTree: VNode; // 自己vnode tree
	effect: ReactiveEffect; //render effect
	update: SchedulerJob; // 组价更新方法
	render: Function | null; // 组件render 方法
	provides: Data; //provide
	components: Record<string, ConcreteComponent> | null; // 子组件
	directives: Record<string, Directive> | null; // 定义的指令
	filters?: Record<string, Function>; // 定义的filter
	propsOptions: NormalizedPropsOptions; // 自己的属性
	emitsOptions: ObjectEmitsOptions | null; // emit
	inheritAttrs?: boolean; // 是否继承
	isCE?: boolean; // 是否是自定义
	proxy: ComponentPublicInstance | null; // 后续访问通过这个
	exposed: Record<string, any> | null; // 导出的方法
	exposeProxy: Record<string, any> | null; // 导出的proxy
	ctx: Data; // 上下文
	data: Data;
	propsDefaults: Data;
	props: Data;
	attrs: Data;
	slots: InternalSlots;
	refs: Data; // 保存的ref
	emit: Function; // emit
	emitted: Record<string, boolean> | null; // 加了.once 的
	accessCache: Data | null; // 避免hasown
	renderCache: (Function | VNode)[]; // render 的cache
	setupState: Data; // setup方法的返回值 不是当做render 的情况下
	setupContext: SetupContext | null; // setup 的第二个参数
	isMounted: boolean; // 是否挂载
	isUnmounted: boolean; // 是否已经卸载
}

export interface ClassComponent {
	new (...args: any[]): ComponentPublicInstance<any, any, any>;
	__vccOpts: ComponentOptions;
}

export interface AllowedComponentProps {
	class?: unknown;
	style?: unknown;
}

export interface ComponentCustomProps {}

export type SetupContext<E = EmitsOptions> = E extends any
	? {
			attrs: Data;
			slots: Slots;
			emit: Function;
			expose: (exposed?: Record<string, any>) => void;
	  }
	: never;

export function isClassComponent(value: unknown): value is ClassComponent {
	return isFunction(value) && '__vccOpts' in value;
}

export function isStatefulComponent(instance: ComponentInternalInstance) {
	return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT;
}

// slot 和 component 是内置的
const isBuiltInTag = makeMap('slot,component');

export function validateComponentName(name: string, config: AppConfig) {
	const appIsNativeTag = config.isNativeTag || NO;
	if (isBuiltInTag(name) || appIsNativeTag(name)) {
		console.warn(
			'Do not use built-in or reserved HTML elements as component id: ' + name
		);
	}
}

const emptyAppContext = createAppContext();

let uid = 0;

export function createComponentInstance(
	vnode: VNode,
	parent: ComponentInternalInstance | null
) {
	const type = vnode.type as ConcreteComponent;
	// inherit parent app context - or - if root, adopt from root vnode
	const appContext =
		(parent ? parent.appContext : vnode.appContext) || emptyAppContext;

	const instance: ComponentInternalInstance = {
		uid: uid++,
		vnode,
		type,
		parent,
		appContext,
		root: null!,
		next: null,
		subTree: null!,
		effect: null!,
		update: null!,
		render: null,
		proxy: null,
		exposed: null,
		exposeProxy: null,
		provides: parent ? parent.provides : Object.create(appContext.provides),
		components: null,
		directives: null,

		// 我先没处理props emit
		propsOptions: [],
		emitsOptions: {},
		emit: null!,
		emitted: null,

		inheritAttrs: type.inheritAttrs,

		accessCache: null,
		renderCache: [],

		ctx: EMPTY_OBJ,
		data: EMPTY_OBJ,
		props: EMPTY_OBJ,
		propsDefaults: EMPTY_OBJ,
		slots: EMPTY_OBJ,
		attrs: EMPTY_OBJ,
		refs: EMPTY_OBJ,
		setupState: EMPTY_OBJ,
		setupContext: null,
		isMounted: false,
		isUnmounted: false
	};
	instance.ctx = { _: instance };
	instance.root = parent ? parent.root : instance;
	instance.emit = emit.bind(null, instance);

	return instance;
}

export function setupComponent(instance: ComponentInternalInstance) {
	const { props } = instance.vnode;
	initProps(instance, props);

	// todo slots 处理

	const setupResult = setupStatefulComponent(instance);
	return setupResult;
}

function setupStatefulComponent(instance: ComponentInternalInstance) {
	// 这个type 其实就是 我们定义的那个对象 { setup() {}, .... }
	const Component = instance.type as ComponentOptions;

	if (__DEV__) {
		if (Component.name) {
			validateComponentName(Component.name, instance.appContext.config);
		}
		if (Component.components) {
			const names = Object.keys(Component.components);
			for (let i = 0; i < names.length; i++) {
				validateComponentName(names[i], instance.appContext.config);
			}
		}
		if (Component.directives) {
			const names = Object.keys(Component.directives);
			for (let i = 0; i < names.length; i++) {
				validateDirectiveName(names[i]);
			}
		}
	}
	instance.accessCache = Object.create(null);
	instance.proxy = markRaw(
		new Proxy(instance.ctx, PublicInstanceProxyHandlers)
	);
	if (__DEV__) {
		// 会把props 弄到ctx上
		exposePropsOnRenderContext(instance);
	}
	const { setup } = Component;
	if (setup) {
		// 根据setup 的参数数量 选择是否需要创建 context
		// setup(props) {} 1
		// setup(props, ctx) {} 2
		const setupContext = (instance.setupContext =
			setup.length > 1 ? createSetupContext(instance) : null);

		// todo 执行setup
	} else {
		// 应该调用组件的render
	}
}

function createAttrsProxy(instance: ComponentInternalInstance): Data {
	return new Proxy(
		instance.attrs,
		__DEV__
			? {
					get(target, key: string) {
						markAttrsAccessed();
						track(instance, '$attrs');
						return target[key];
					},
					set() {
						console.warn(`setupContext.attrs is readonly.`);
						return false;
					},
					deleteProperty() {
						console.warn(`setupContext.attrs is readonly.`);
						return false;
					}
			  }
			: {
					get(target, key: string) {
						track(instance, '$attrs');
						return target[key];
					}
			  }
	);
}

export function createSetupContext(
	instance: ComponentInternalInstance
): SetupContext {
	const expose: SetupContext['expose'] = (exposed) => {
		if (__DEV__ && instance.exposed) {
			console.warn(`expose() should be called only once per setup().`);
		}
		instance.exposed = exposed || {};
	};

	let attrs: Data;
	if (__DEV__) {
		return Object.freeze({
			get attrs() {
				return attrs || (attrs = createAttrsProxy(instance));
			},
			get slots() {
				return shallowReadonly(instance.slots);
			},
			get emit() {
				return (event: string, ...args: any[]) => instance.emit(event, ...args);
			},
			expose
		});
	} else {
		return {
			get attrs() {
				return attrs || (attrs = createAttrsProxy(instance));
			},
			slots: instance.slots,
			emit: instance.emit,
			expose
		};
	}
}
