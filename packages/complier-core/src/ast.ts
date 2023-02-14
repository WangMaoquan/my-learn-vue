import { TransformContext } from './transform';

export const enum NodeTypes {
	ROOT, // 根
	ELEMENT, // html 元素
	TEXT, // 文本
	COMMENT, // 注释
	SIMPLE_EXPRESSION, // {{ xxx }} 中的 xxx
	INTERPOLATION, // {{}}
	COMPOUND_EXPRESSION, // text, {{}}之类

	// codegen
	VNODE_CALL
}

export const enum ElementTypes {
	ELEMENT,
	COMPONENT,
	SLOT,
	TEMPLATE
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

export type ElementNode = PlainElementNode;

export interface BaseElementNode extends Node {
	type: NodeTypes.ELEMENT;
	tag: string;
	props: Array<any>;
	children: TemplateChildNode[];
}

export interface PlainElementNode extends BaseElementNode {
	tagType: ElementTypes.ELEMENT;
	codegenNode:
		| VNodeCall
		| SimpleExpressionNode // when hoisted
		| undefined;
}

export type TemplateTextChildNode =
	| TextNode
	| InterpolationNode
	| CompoundExpressionNode;
export type PropsExpression = ExpressionNode;

export interface VNodeCall extends Node {
	type: NodeTypes.VNODE_CALL;
	tag: string | symbol;
	props: PropsExpression | undefined;
	children:
		| TemplateChildNode[] // multiple children
		| TemplateTextChildNode // single text child
		| SimpleExpressionNode // hoisted
		| undefined;
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

export function createVNodeCall(
	context: TransformContext | null,
	tag: VNodeCall['tag'],
	props?: VNodeCall['props'],
	children?: VNodeCall['children']
): VNodeCall {
	return {
		type: NodeTypes.VNODE_CALL,
		tag,
		props,
		children
	};
}
