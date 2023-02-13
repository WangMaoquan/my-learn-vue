export const enum NodeTypes {
	ROOT, // 根
	ELEMENT, // html 元素
	TEXT, // 文本
	COMMENT, // 注释
	SIMPLE_EXPRESSION, // {{ xxx }} 中的 xxx
	INTERPOLATION // {{}}
}

export interface Node {
	type: NodeTypes;
}

export type TemplateChildNode = ElementNode | TextNode;

export interface RootNode extends Node {
	children: TemplateChildNode[];
}

export interface ElementNode extends Node {
	tag: string;
	children: TemplateChildNode[];
}

export interface TextNode extends Node {
	content: string;
}

/**
 * 创建 ast 的根节点
 */
export function createRoot(children: TemplateChildNode[]): RootNode {
	return {
		type: NodeTypes.ROOT,
		children
	};
}
