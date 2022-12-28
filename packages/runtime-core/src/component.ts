import { ReactiveEffect } from '@vue/reactivity';
import { EMPTY_OBJ, isFunction, makeMap, NO, ShapeFlags } from '@vue/shared';
import { AppConfig, AppContext, createAppContext } from './apiCreateApp';
import { emit, EmitsOptions, ObjectEmitsOptions } from './componentEmits';
import { ComponentOptions } from './componentOptions';
import { NormalizedPropsOptions } from './componentProps';
import { ComponentPublicInstance } from './componentPublicInstance';
import { InternalSlots, Slots } from './componentSlots';
import { Directive } from './directives';
import { SchedulerJob } from './scheduler';
import { VNode } from './vnode';

export type Data = Record<string, unknown>;
export interface Component {}
export type ConcreteComponent<Props = {}, RawBindings = any> = ComponentOptions<
	Props,
	RawBindings
>;
export interface ComponentInternalInstance {}
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
	props: Data;
	attrs: Data;
	slots: InternalSlots;
	refs: Data; // 保存的ref
	emit: Function; // emit
	emitted: Record<string, boolean> | null; // 加了.once 的
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

		ctx: EMPTY_OBJ,
		data: EMPTY_OBJ,
		props: EMPTY_OBJ,
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
