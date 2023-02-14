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
	code += `return "hi"`;
	code += `}`;

	return {
		code,
		ast
	};
}
