import { ShapeFlags } from '@vue/shared';
import { ComponentInternalInstance } from './component';
import { setCurrentRenderingInstance } from './componentRenderContext';
import { createVNode, normalizeVNode, VNode } from './vnode';

// $attr 在render是否被使用的标志
let accessedAttrs = false;

export function markAttrsAccessed() {
	accessedAttrs = true;
}

// 校验
accessedAttrs;

export function renderComponentRoot(
	instance: ComponentInternalInstance
): VNode {
	const {
		vnode,
		proxy,
		props,
		attrs,
		render,
		renderCache,
		data,
		setupState,
		ctx
	} = instance;

	let result: any;
	let fallthroughAttrs;
	// 保存上一次的 instance
	const prev = setCurrentRenderingInstance(instance);
	if (__DEV__) {
		accessedAttrs = false;
	}

	try {
		// 执行 状态组件的render
		if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
			const proxyToUse = proxy;
			result = normalizeVNode(
				render!.call(
					proxyToUse,
					proxyToUse!,
					renderCache,
					props,
					setupState,
					data,
					ctx
				)
			);
			fallthroughAttrs = attrs;
		}
	} catch (err) {
		// 通过校验
		fallthroughAttrs;
		console.log(err);
		result = createVNode(Comment);
	}

	setCurrentRenderingInstance(prev);
	return result!;
}

/**
 * 判断是否需要更新
 * 只判断了props
 */
export function shouldUpdateComponent(
	prevVNode: VNode,
	nextVNode: VNode
): boolean {
	const { props: prevProps } = prevVNode;
	const { props: nextProps } = nextVNode;
	// todo children
	if (prevProps === nextProps) {
		return false;
	}
	if (!prevProps) {
		return !!nextProps;
	}
	if (!nextProps) {
		return true;
	}

	return false;
}
