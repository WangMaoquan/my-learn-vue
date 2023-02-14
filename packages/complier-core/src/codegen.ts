import { RootNode, TemplateChildNode } from './ast';

// https://template-explorer.vuejs.org/

export interface CodegenResult {
	code: string;
	ast: RootNode;
}

type CodegenNode = TemplateChildNode;

export interface CodegenContext {
	code: string;
	push(code: string): void;
}

export function generate(ast: RootNode): CodegenResult {
	const context = createCodegenContext(ast);
	const { push } = context;
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
	const { push } = context;
	push(`"${(node as any).content}"`);
}
