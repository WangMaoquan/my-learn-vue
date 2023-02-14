import { JSChildNode, NodeTypes, RootNode, TemplateChildNode } from './ast';

// https://template-explorer.vuejs.org/

export interface CodegenResult {
	code: string;
	ast: RootNode;
}

type CodegenNode = TemplateChildNode | JSChildNode;

export interface CodegenContext {
	code: string;
	push(code: string): void;
}

// 将方法重命名
const aliasHelper = (s: string) => `${s}: _${s}`;

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
		default:
			break;
	}
}

function genText(node: CodegenNode, context: CodegenContext) {
	const { push } = context;
	push(`"${(node as any).content}"`);
}

function genInterpolation(node: CodegenNode, context: CodegenContext) {
	const { push } = context;
	push(`_toDisplayString(`);
	console.log(node);
	genNode((node as any).content, context);
	push(')');
}

function genExpression(node: CodegenNode, context: CodegenContext) {
	const { push } = context;
	push(`${(node as any).content}`);
}

// 生成 导入 const {} = Vue
function genFunctionPreamble(ast: RootNode, { push }: CodegenContext) {
	const bindings = 'Vue';
	const helpers = Array.from(ast.helpers);
	push(`const { ${helpers.map(aliasHelper).join(', ')} } = ${bindings}`);
	push('\n');
}
