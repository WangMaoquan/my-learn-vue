import { createRoot, NodeTypes } from './ast';

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

	let node;

	// 只有是 {{ 开头时 才会去处理
	if (context.source.startsWith('{{')) {
		node = parseInterpolation(context);
	}

	nodes.push(node);

	return nodes;
}

// 处理插值
function parseInterpolation(context: ParserContext) {
	const openDelimiter = '{{';
	const closeDelimiter = '}}';

	// todo 处理 {{ xxx }}
	// 通过找到 }}的索引, 然后减  2({{的长度) 就是 xxx 的长度

	const closeIndex = context.source.indexOf(
		closeDelimiter,
		openDelimiter.length
	);

	// {{xxx}} => xxx}}
	advanceBy(context, openDelimiter.length);

	const rawContentLen = closeIndex - openDelimiter.length;

	const rawContent = context.source.slice(0, rawContentLen);

	// 处理 {{ content }} 情况
	const content = rawContent.trim();

	// xxx }} =>
	advanceBy(context, closeDelimiter.length);

	return {
		type: NodeTypes.INTERPOLATION,
		content: {
			type: 'simple_expression',
			content
		}
	};
}

// 解析后 截取掉我们解析的部分
function advanceBy(context: ParserContext, numberOfCharacters: number): void {
	const { source } = context;
	context.source = source.slice(numberOfCharacters);
}
