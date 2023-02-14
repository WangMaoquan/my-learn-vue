import { RootNode } from './ast';

// https://template-explorer.vuejs.org/

export interface CodegenResult {
	code: string;
	ast: RootNode;
}

export function generate(ast: RootNode): CodegenResult {
	let code = `return `;
	const functionName = 'render';
	const args = ['_ctx', '_cache'];
	const signature = args.join(', ');

	code += `function ${functionName}(${signature}){`;
	const node = ast.codegenNode;
	code += `return "${(node as any).content}"`; // 这一步其实我们可以放到 transform 里面去生成
	code += `}`;

	return {
		code,
		ast
	};
}
