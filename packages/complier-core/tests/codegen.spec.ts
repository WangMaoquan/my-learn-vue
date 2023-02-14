import { baseParse, generate, transform, transformExpression } from '../src';

describe('codegen', () => {
	test('string', () => {
		const ast = baseParse('hi');
		transform(ast);
		const { code } = generate(ast);

		// 使用快照 -u更新快照
		expect(code).toMatchSnapshot();
	});

	test('interpolation', () => {
		const ast = baseParse('{{message}}');
		transform(ast, {
			nodeTransforms: [transformExpression]
		});
		const { code } = generate(ast);

		expect(code).toMatchSnapshot();
	});
});
