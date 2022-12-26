import { Ref } from '@vue/reactivity';
import { ComponentPublicInstance } from './componentPublicInstance';

export interface VNode {}

// vnode ref 属性
export type VNodeRef =
	| string
	| Ref
	| ((
			ref: Element | ComponentPublicInstance | null,
			refs: Record<string, any>
	  ) => void);

// vnode 挂载钩子
type VNodeMountHook = (vnode: VNode) => void;
// vnode 更新钩子
type VNodeUpdateHook = (vnode: VNode, oldVNode: VNode) => void;

export type VNodeProps = {
	key?: string | number | symbol; // 唯一key
	ref?: VNodeRef; // ref

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
