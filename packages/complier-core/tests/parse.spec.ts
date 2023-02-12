import { baseParse, NodeTypes } from '../';

/**
 * vue template => render 方法
 *
 * template 字符串 => parse => ast
 *
 * ast  => transfrom => ast 优化
 *
 * ast  => codegen => render
 */
describe('parse', () => {
	// 处理差值表达式
	describe('interpolation', () => {
		// 简单的差值表达式的处理
		test('simple interpolation', () => {
			/**
			 * baseParse 返回的是一个根astNode
			 */
			const ast = baseParse(`{{message}}`);
			expect(ast.children[0]).toStrictEqual({
				type: NodeTypes.INTERPOLATION,
				content: {
					type: 'simple_expression',
					content: 'message'
				}
			});
		});
		test('simple interpolation edge case', () => {
			const ast = baseParse(`{{ message }}`);
			expect(ast.children[0]).toStrictEqual({
				type: NodeTypes.INTERPOLATION,
				content: {
					type: 'simple_expression',
					content: 'message'
				}
			});
		});
	});

	describe('element', () => {
		test('simple element div', () => {
			const ast = baseParse(`<div></div>`);
			expect(ast.children[0]).toStrictEqual({
				type: NodeTypes.ELEMENT,
				tag: 'div'
			});
		});
	});

	describe('text', () => {
		test('simple text', () => {
			const ast = baseParse(`some text`);
			expect(ast.children[0]).toStrictEqual({
				type: NodeTypes.TEXT,
				content: 'some text'
			});
		});
	});
});
