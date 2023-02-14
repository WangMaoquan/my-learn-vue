import { baseParse, generate } from '../src';

describe('codegen', () => {
	test('simple', () => {
		const ast = baseParse('hi');
		const { code } = generate(ast);

		// 使用快照 -u更新快照
		expect(code).toMatchSnapshot();
	});
});
