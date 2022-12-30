import { isArray, isObject } from '@vue/shared';
import {
	createVNode,
	isVNode,
	VNode,
	VNodeArrayChildren,
	VNodeProps
} from './vnode';

type RawChildren =
	| string
	| number
	| boolean
	| VNode
	| VNodeArrayChildren
	| (() => any);

type RawProps = VNodeProps & {
	__v_isVNode?: never; // 区别vnode
	[Symbol.iterator]?: never; // 区别vnodeChildren
} & Record<string, any>;

// 这里 只是实现了 对 原生标签的实现
export function h(type: string, children?: RawChildren): VNode;
export function h(
	type: string,
	props?: RawProps | null,
	children?: RawChildren
): VNode;

export function h(type: any, propsOrChildren?: any, children?: any): VNode {
	const l = arguments.length;
	if (l === 2) {
		// 是对象 且不是 数组, children 要么是数组形式 要么 字符串啥的, 也有可能是一个vnode
		if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
			// 判断是否是vnode
			if (isVNode(propsOrChildren)) {
				return createVNode(type, null, [propsOrChildren]);
			}
			return createVNode(type, propsOrChildren);
		} else {
			// 当做children
			return createVNode(type, null, propsOrChildren);
		}
	} else {
		if (l > 3) {
			// 类似这种 h("div", {class: 'decade'}, h("span", 1), h("span", 2))
			children = Array.prototype.slice.call(arguments, 2);
		} else if (l === 3 && isVNode(children)) {
			// 类似这种 h("div", {class: 'decade'}, h("span", 1))
			children = [children];
		}
		return createVNode(type, propsOrChildren, children);
	}
}
