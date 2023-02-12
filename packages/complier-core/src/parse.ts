import { createRoot } from './ast';

/**
 * baseParse 接受一个字符串 返回一个 root AST
 *
 * 1. 创建全局的context 对象,后续处理都是在这个context上处理 createParseContext
 *
 * 2. 返回一个 ast root node createRoot
 *
 * 3. parse ast root node 的children  parseChildren
 *
 * 4. 针对不同的child 处理child
 */

export interface ParserContext {
	source: string;
}

export function baseParse(content: string) {
	// 全局上下文对象
	const context = createParseContext(content);

	return createRoot(parseChildren(context));
}

// 生成全局上下文对象
function createParseContext(content: string): ParserContext {
	return {
		source: content // 后续处理都是针对这个source
	};
}

// 解析 生成的context 返回 ast节点的children
function parseChildren(context: ParserContext) {
	const nodes: any[] = [];

	const node = parseInterpolation(context);

	nodes.push(node);

	return nodes;
}

// 处理插值
function parseInterpolation(context: ParserContext) {
	// todo 处理context
	return {
		type: 'interpolation',
		content: {
			type: 'simple_expression',
			content: 'message'
		}
	};
}
