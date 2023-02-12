/**
 * baseParse 接受一个字符串 返回一个 root AST
 */
export function baseParse(content: string) {
	return {
		children: [
			{
				type: 'interpolation',
				content: {
					type: 'simple_expression',
					content: 'message'
				}
			}
		]
	};
}
