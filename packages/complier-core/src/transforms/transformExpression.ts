import { NodeTypes } from '../ast';
import { NodeTransform } from '../transform';

export const transformExpression: NodeTransform = (node) => {
	if (node.type === NodeTypes.INTERPOLATION) {
		const rawContent = node.content.content;
		node.content.content = `_ctx.${rawContent}`;
	}
};
