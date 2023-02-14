import {
	baseParse,
	generate,
	transform,
	transformExpression,
	transformElement,
	transformText
} from '../src';

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

	test('element', () => {
		const ast = baseParse('<div></div>');
		transform(ast, {
			nodeTransforms: [transformElement]
		});
		const { code } = generate(ast);

		expect(code).toMatchSnapshot();
	});

	test('mxixin', () => {
		const ast = baseParse(`<div>hi, {{message}}</div>`);
		transform(ast, {
			nodeTransforms: [transformExpression, transformElement, transformText]
		});
		const { code } = generate(ast);
		expect(code).toMatchSnapshot();
	});
});
