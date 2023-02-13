import { NodeTypes, RootNode, TemplateChildNode, TextNode } from './ast';
export function transform(root: RootNode) {
	traverseNode(root);
	return root;
}

function traverseNode(node: TemplateChildNode | RootNode) {
	const children = 'children' in node ? node.children : [];

	// 根据不同的类型去处理
	switch (node.type) {
		case NodeTypes.TEXT:
			(node as TextNode).content += '王小明';
			break;
		default:
			break;
	}

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		traverseNode(child);
	}
}
