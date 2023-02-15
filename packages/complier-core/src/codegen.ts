import { isString } from '@vue/shared';
import {
	CompoundExpressionNode,
	ElementNode,
	InterpolationNode,
	JSChildNode,
	NodeTypes,
	RootNode,
	SimpleExpressionNode,
	TemplateChildNode,
	TextNode
} from './ast';
import {
	helperNameMap,
	TO_DISPLAY_STRING,
	CREATE_ELEMENT_VNODE
} from './runtimeHelpers';

// https://template-explorer.vuejs.org/

export interface CodegenResult {
	code: string;
	ast: RootNode;
}

type CodegenNode = TemplateChildNode | JSChildNode;

export interface CodegenContext {
	code: string;
	push(code: string): void;
	helper(key: symbol): string;
}

// 将方法重命名
const aliasHelper = (s: symbol) => `${helperNameMap[s]}: _${helperNameMap[s]}`;

export function generate(ast: RootNode): CodegenResult {
	const context = createCodegenContext(ast);
	const { push } = context;

	// 只有在helps 长度大于0 才需要导入
	if (ast.helpers.size > 0) {
		genFunctionPreamble(ast, context);
	}

	push(`return `);
	const functionName = 'render';
	const args = ['_ctx', '_cache'];
	const signature = args.join(', ');

	push(`function ${functionName}(${signature}){`);
	push(`return `);
	genNode(ast.codegenNode!, context);
	push(`}`);

	return {
		code: context.code,
		ast
	};
}

function createCodegenContext(
	ast: RootNode,
	{ code }: any = {
		code: ``
	}
): CodegenContext {
	const context: CodegenContext = {
		code,
		push(code: string) {
			context.code += code;
		},
		helper(key) {
			return `_${helperNameMap[key]}`;
		}
	};

	return context;
}

function genNode(node: CodegenNode, context: CodegenContext) {
	switch (node.type) {
		case NodeTypes.TEXT:
			genText(node, context);
			break;
		case NodeTypes.INTERPOLATION:
			genInterpolation(node, context);
			break;
		case NodeTypes.SIMPLE_EXPRESSION:
			genExpression(node, context);
			break;
		case NodeTypes.ELEMENT:
			genElement(node, context);
			break;
		case NodeTypes.COMPOUND_EXPRESSION:
			genCompound(node, context);
			break;
		default:
			break;
	}
}

function genText(node: TextNode, context: CodegenContext) {
	const { push } = context;
	push(`"${node.content}"`);
}

function genInterpolation(node: InterpolationNode, context: CodegenContext) {
	const { push, helper } = context;
	push(`${helper(TO_DISPLAY_STRING)}(`);
	genNode(node.content, context);
	push(')');
}

function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
	const { push } = context;
	push(`${node.content}`);
}

// 生成 导入 const {} = Vue
function genFunctionPreamble(ast: RootNode, { push }: CodegenContext) {
	const bindings = 'Vue';
	const helpers = Array.from(ast.helpers);
	push(`const { ${helpers.map(aliasHelper).join(', ')} } = ${bindings}`);
	push('\n');
}

function genElement(node: ElementNode, context: CodegenContext) {
	const { tag, children, props } = node;
	const { push, helper } = context;
	push(`${helper(CREATE_ELEMENT_VNODE)}("${tag}"`);
	if (children.length > 0) {
		push(`, ${props || 'null'}, `);
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			genNode(child, context);
		}
	}
	push(')');
}

function genCompound(node: CompoundExpressionNode, context: CodegenContext) {
	const { children } = node;
	const { push } = context;

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (isString(child)) {
			push(child);
		} else {
			genNode(child, context);
		}
	}
}
