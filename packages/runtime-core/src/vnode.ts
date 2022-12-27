import { ReactiveFlags } from '@vue/reactivity';
import { isFunction, isObject, isString, ShapeFlags } from '@vue/shared';
import { AppContext } from './apiCreateApp';
import {
	ClassComponent,
	Component,
	ComponentInternalInstance,
	Data,
	isClassComponent
} from './component';
import {
	currentRenderingInstance,
	currentScopeId
} from './componentRenderContext';
import { isSuspense } from './components/Suspense';
import { isTeleport } from './components/Teleport';
import { NULL_DYNAMIC_COMPONENT } from './helper/resolveAssets';
import { RendererElement, RendererNode } from './renderer';
export const Fragment = Symbol(__DEV__ ? 'Fragment' : undefined) as any as {
	__isFragment: true;
	new (): {
		$props: VNodeProps;
	};
};
export const Text = Symbol(__DEV__ ? 'Text' : undefined);
export const Comment = Symbol(__DEV__ ? 'Comment' : undefined);
export const Static = Symbol(__DEV__ ? 'Static' : undefined);
export type VNodeTypes =
	| string
	| VNode
	| Component
	| typeof Text
	| typeof Comment;

// 最基本的vnode child
type VNodeChildAtom =
	| VNode
	| string
	| number
	| boolean
	| null
	| undefined
	| void;

export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>;

export type VNodeChild = VNodeChildAtom | VNodeArrayChildren;

export type VNodeNormalizedChildren = string | VNodeArrayChildren | null;

export interface VNode<
	HostNode = RendererNode,
	HostElement = RendererElement,
	ExtraProps = { [key: string]: any }
> {
	__v_isVNode: true; // vnode 标志
	[ReactiveFlags.SKIP]: true; // 表示不需要被响应式化
	type: VNodeTypes; // 类型
	props: (VNodeProps & ExtraProps) | null; // 属性
	key: string | number | symbol | null; // 唯一key
	children: VNodeNormalizedChildren; // 子节点
	component: ComponentInternalInstance | null; // 对应的instance

	// DOM 部分
	el: HostNode | null; // 真实dom

	// 优化操作
	shapeFlag: number; // 什么样的vnode 标记, 根据这个标记去执行对应process方法
	patchFlag: number; // patch时的标记

	appContext: AppContext | null;
	ctx: ComponentInternalInstance | null;
}

// vnode 挂载钩子
type VNodeMountHook = (vnode: VNode) => void;
// vnode 更新钩子
type VNodeUpdateHook = (vnode: VNode, oldVNode: VNode) => void;

export type VNodeProps = {
	key?: string | number | symbol; // 唯一key

	// vnode 挂载前执行的 钩子
	onVnodeBeforeMount?: VNodeMountHook | VNodeMountHook[];
	// 挂载完成执行的 钩子
	onVnodeMounted?: VNodeMountHook | VNodeMountHook[];
	// 更新前执行的钩子
	onVnodeBeforeUpdate?: VNodeUpdateHook | VNodeUpdateHook[];
	// 更新完成执行的钩子
	onVnodeUpdated?: VNodeUpdateHook | VNodeUpdateHook[];
	// 卸载前执行的钩子
	onVnodeBeforeUnmount?: VNodeMountHook | VNodeMountHook[];
	// 卸载完成执行的钩子
	onVnodeUnmounted?: VNodeMountHook | VNodeMountHook[];
};

export function isVNode(value: any): value is VNode {
	return value ? value.__v_isVNode === true : false;
}

export const createVNode = _createVNode;

function _createVNode(
	type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
	props: (Data & VNodeProps) | null = null,
	children: unknown = null,
	patchFlag = 0,
	dynamicProps: string[] | null = null,
	isBlockNode = false
): VNode {
	if (!type || type === NULL_DYNAMIC_COMPONENT) {
		if (__DEV__ && !type) {
			console.warn(`Invalid vnode type when creating vnode: ${type}.`);
		}
		type = Comment;
	}
	if (isClassComponent(type)) {
		type = type.__vccOpts;
	}

	const shapeFlag = isString(type)
		? ShapeFlags.ELEMENT
		: isSuspense(type)
		? ShapeFlags.SUSPENSE
		: isTeleport(type)
		? ShapeFlags.TELEPORT
		: isObject(type)
		? ShapeFlags.STATEFUL_COMPONENT
		: isFunction(type)
		? ShapeFlags.FUNCTIONAL_COMPONENT
		: 0;

	return createBaseVNode(
		type,
		props,
		children,
		patchFlag,
		dynamicProps,
		shapeFlag,
		isBlockNode,
		true
	);
}

function createBaseVNode(
	type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
	props: (Data & VNodeProps) | null = null,
	children: unknown = null,
	patchFlag = 0,
	dynamicProps: string[] | null = null,
	shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
	isBlockNode = false,
	needFullChildrenNormalization = false
) {
	const vnode = {
		__v_isVNode: true,
		__v_skip: true,
		type,
		props,
		key: props && props.key,
		scopeId: currentScopeId,
		slotScopeIds: null,
		children,
		component: null,
		el: null,
		shapeFlag,
		patchFlag,
		dynamicProps,
		dynamicChildren: null,
		appContext: null,
		ctx: currentRenderingInstance
	} as VNode;

	if (children) {
		vnode.shapeFlag |= isString(children)
			? ShapeFlags.TEXT_CHILDREN
			: ShapeFlags.ARRAY_CHILDREN;
	}

	return vnode;
}

export { createBaseVNode as createElementVNode };
