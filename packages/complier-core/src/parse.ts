import { createRoot, NodeTypes, ElementNode, TextNode } from './ast';

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

const enum TagType {
	Start,
	End
}

export function baseParse(content: string) {
	// 全局上下文对象
	const context = createParseContext(content);

	return createRoot(parseChildren(context, []));
}

// 生成全局上下文对象
function createParseContext(content: string): ParserContext {
	return {
		source: content // 后续处理都是针对这个source
	};
}

// 解析 生成的context 返回 ast节点的children
function parseChildren(context: ParserContext, ancestors: string[]) {
	const nodes: any[] = [];

	// 需要一步一步走 所以需要循环
	while (!isEnd(context, ancestors)) {
		const s = context.source;
		let node;

		// 只有是 {{ 开头时 才会去处理
		if (s.startsWith('{{')) {
			node = parseInterpolation(context);
		} else if (s[0] === '<') {
			// < 开头 第二个是字母 认为是 element
			if (/[a-z]/i.test(s[1])) {
				node = parseElement(context, ancestors);
			}
		}

		// 默认走文本
		if (!node) {
			node = parseText(context);
		}

		nodes.push(node);
	}

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

	const rawContent = parseTextData(context, rawContentLen);

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

function parseElement(context: ParserContext, ancestors: string[]) {
	const element = parseTag(context, TagType.Start);
	ancestors.push(element.tag);
	// 处理 element 里面的children
	element.children = parseChildren(context, ancestors);
	ancestors.pop();

	// 需要验证 结束的tag 是不是对应的
	if (element.tag === context.source.slice(2, element.tag.length)) {
		parseTag(context, TagType.End);
	} else {
		throw Error(`缺少close tag: ${element.tag}`);
	}
	return element;
}

function parseTag(context: ParserContext, type: TagType.Start): ElementNode;
function parseTag(context: ParserContext, type: TagType.End): void;
function parseTag(
	context: ParserContext,
	type: TagType
): ElementNode | undefined {
	// todo 处理属性
	// 1. 解析tag
	const match = /^<\/?([a-z]*)/i.exec(context.source)!;
	const tag = match[1];

	// 2. 修改source
	advanceBy(context, match[0].length);
	advanceBy(context, 1);

	if (type === TagType.End) {
		return;
	}

	// elementNode 里面存在 插值 文本 element之类的 所以需要children 属性
	return {
		tag,
		type: NodeTypes.ELEMENT,
		children: []
	};
}

function parseText(context: ParserContext): TextNode {
	let endIndex = context.source.length;
	// 因为文本Node 加别的node 我们截取的长度不应该是source.length 文本的长度

	// 这里处理的文本 + 插值的情况 所以我们只需要截取到 {{ 之前
	// todo 文本加 element
	const endTokens = ['{{', '<'];
	for (let i = 0; i < endTokens.length; i++) {
		const endTokenIndex = context.source.indexOf(endTokens[i]);
		// 截取的越靠前越好
		if (endTokenIndex !== -1 && endIndex > endTokenIndex) {
			endIndex = endTokenIndex;
		}
	}

	const content = parseTextData(context, endIndex);
	return {
		type: NodeTypes.TEXT,
		content
	};
}

function parseTextData(context: ParserContext, length: number): string {
	const rawText = context.source.slice(0, length);
	advanceBy(context, length);
	return rawText;
}

function isEnd(context: ParserContext, ancestors: string[]): boolean {
	/**
	 * 1. s已经被处理完了 是需要停止循环的
	 * 2. element 的结束</ 这种也是需要停止循环的
	 */
	const s = context.source;
	for (let i = 0; i < ancestors.length; i++) {
		const tag = ancestors[i];
		if (tag === s.slice(2, 2 + tag.length)) {
			return true;
		}
	}

	return !s;
}
