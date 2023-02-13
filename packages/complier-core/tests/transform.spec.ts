import { ElementNode } from './../src/ast';
import { baseParse, TextNode, transform } from '../src';

describe('transform', () => {
	/**
	 * transform 主要做的事情就是修改 ast 节点信息
	 *
	 * 比如 给所有的 textNode 加上 王小明
	 *
	 * 要找到 相应的 ast 节点 就需要遍历
	 *
	 * 遍历树 我们可以选择 广度优先 与 深度优先
	 */
	test('transform text node', () => {
		const ast = baseParse(`<div>hi,{{message}}</div>`);
		transform(ast);
		const textNode = (ast.children[0] as ElementNode).children[0] as TextNode;
		expect(textNode.content).toBe('hi,王小明');
	});
});
