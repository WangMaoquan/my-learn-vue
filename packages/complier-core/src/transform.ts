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
	const context = createTransformContext(root, options);
	traverseNode(root, context);
	return root;
}

function traverseNode(
	node: TemplateChildNode | RootNode,
	context: TransformContext
) {
	const nodeTransforms = context.nodeTransforms;

	for (let i = 0; i < nodeTransforms.length; i++) {
		nodeTransforms[i](node, context);
	}
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
