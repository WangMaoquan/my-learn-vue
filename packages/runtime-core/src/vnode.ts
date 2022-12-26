import { ReactiveFlags, Ref } from '@vue/reactivity';
import { AppContext } from './apiCreateApp';
import { Component, ComponentInternalInstance } from './component';
import { RendererElement, RendererNode } from './renderer';

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
