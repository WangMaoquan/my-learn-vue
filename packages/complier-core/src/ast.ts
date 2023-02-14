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

export type ParentNode = RootNode | ElementNode;

export interface RootNode extends Node {
	children: TemplateChildNode[];
	type: NodeTypes.ROOT;
	codegenNode?: TemplateChildNode;
}

export interface ElementNode extends Node {
	tag: string;
	children: TemplateChildNode[];
	type: NodeTypes.ELEMENT;
}

export interface TextNode extends Node {
	content: string;
	type: NodeTypes.TEXT;
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
