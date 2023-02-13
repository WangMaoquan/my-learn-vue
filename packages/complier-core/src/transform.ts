import { RootNode, TemplateChildNode, ParentNode, NodeTypes } from './ast';
import { TransformOptions } from './options';

export interface TransformContext {
	root: RootNode;
	nodeTransforms: NodeTransform[];
}

export type NodeTransform = (
	node: RootNode | TemplateChildNode,
	context: TransformContext
) => void | (() => void) | (() => void)[];

export function transform(root: RootNode, options: TransformOptions) {
	// 创建 上下文对象, 保存option 中配置
	const context = createTransformContext(root, options);
	// 深度优先遍历
	traverseNode(root, context);
	return root;
}

function traverseNode(
	node: TemplateChildNode | RootNode,
	context: TransformContext
) {
	// 获取 nodeTransforms
	const nodeTransforms = context.nodeTransforms;

	// 调用 自定义的plugin
	for (let i = 0; i < nodeTransforms.length; i++) {
		nodeTransforms[i](node, context);
	}

	// root element 才有children
	switch (node.type) {
		case NodeTypes.ROOT:
		case NodeTypes.ELEMENT:
			traverseChildren(node, context);
			break;
		default:
			break;
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
	return {
		root,
		nodeTransforms: options.nodeTransforms || []
	};
}
