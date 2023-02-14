export const enum NodeTypes {
	ROOT, // 根
	ELEMENT, // html 元素
	TEXT, // 文本
	COMMENT, // 注释
	SIMPLE_EXPRESSION, // {{ xxx }} 中的 xxx
	INTERPOLATION, // {{}}
	COMPOUND_EXPRESSION // text, {{}}之类
}

export interface Node {
	type: NodeTypes;
}

export type TemplateChildNode =
	| ElementNode
	| TextNode
	| InterpolationNode
	| CompoundExpressionNode;

export type JSChildNode = ExpressionNode;

export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode;

export type ParentNode = RootNode | ElementNode;

export interface RootNode extends Node {
	children: TemplateChildNode[];
	type: NodeTypes.ROOT;
	codegenNode?: TemplateChildNode;
	helpers: Set<symbol>;
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

export interface InterpolationNode extends Node {
	type: NodeTypes.INTERPOLATION;
	content: ExpressionNode;
}

export interface SimpleExpressionNode extends Node {
	type: NodeTypes.SIMPLE_EXPRESSION;
	content: string;
}

export interface CompoundExpressionNode extends Node {
	type: NodeTypes.COMPOUND_EXPRESSION;
	children: (
		| SimpleExpressionNode
		| CompoundExpressionNode
		| InterpolationNode
		| TextNode
		| string
	)[];
}

/**
 * 创建 ast 的根节点
 */
export function createRoot(children: TemplateChildNode[]): RootNode {
	return {
		type: NodeTypes.ROOT,
		children,
		helpers: new Set()
	};
}

export function createCompoundExpression(
	children: CompoundExpressionNode['children']
): CompoundExpressionNode {
	return {
		type: NodeTypes.COMPOUND_EXPRESSION,
		children
	};
}
