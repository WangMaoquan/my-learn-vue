import { helperNameMap, TO_DISPLAY_STRING } from './runtimeHelpers';
import { RootNode, TemplateChildNode, ParentNode, NodeTypes } from './ast';
import { TransformOptions } from './options';
import { isArray } from '@vue/shared';

export interface TransformContext {
	root: RootNode;
	nodeTransforms: NodeTransform[];
	// helper 是我们处理 对于 createElement toDisplayString 这样的需要从vue 中解构字符串的保存
	helpers: Map<symbol, number>; // helper 的map
	helper<T extends symbol>(name: T): T; // 存入helper 的方法
	helperString(name: symbol): string; // 转换helper 的方法
}

export type NodeTransform = (
	node: RootNode | TemplateChildNode,
	context: TransformContext
) => void | (() => void) | (() => void)[];

export function transform(root: RootNode, options: TransformOptions = {}) {
	// 创建 上下文对象, 保存option 中配置
	const context = createTransformContext(root, options);
	// 深度优先遍历
	traverseNode(root, context);

	createRootCodegen(root);

	// init 将所有的helpers 挂载到root上
	root.helpers = new Set([...context.helpers.keys()]);
	return root;
}

function traverseNode(
	node: TemplateChildNode | RootNode,
	context: TransformContext
) {
	// 获取 nodeTransforms
	const nodeTransforms = context.nodeTransforms;
	const exitFns = [];
	// 调用 自定义的plugin
	for (let i = 0; i < nodeTransforms.length; i++) {
		const onExit = nodeTransforms[i](node, context);
		if (onExit) {
			if (isArray(onExit)) {
				exitFns.push(...onExit);
			} else {
				exitFns.push(onExit);
			}
		}
	}

	// root element 才有children
	switch (node.type) {
		case NodeTypes.ROOT:
		case NodeTypes.ELEMENT:
			traverseChildren(node, context);
			break;
		case NodeTypes.INTERPOLATION: // 插值是需要 使用到toDisplayString 这个方法 所以添加进helper
			context.helper(TO_DISPLAY_STRING);
			break;
		default:
			break;
	}

	let i = exitFns.length;
	while (i--) {
		exitFns[i]();
	}
}

function traverseChildren(node: ParentNode, context: TransformContext) {
	const children = node.children || [];
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		traverseNode(child, context);
	}
}

function createTransformContext(
	root: RootNode,
	options: TransformOptions
): TransformContext {
	const context: TransformContext = {
		root,
		nodeTransforms: options.nodeTransforms || [],
		helpers: new Map(),
		helper(name) {
			context.helpers.set(name, 1);
			return name;
		},
		helperString(name) {
			return `_${helperNameMap[name]}`;
		}
	};
	return context;
}

function createRootCodegen(root: RootNode) {
	root.codegenNode = root.children[0];
}
