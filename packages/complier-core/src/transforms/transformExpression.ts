import { NodeTypes, SimpleExpressionNode } from '../ast';
import { NodeTransform } from '../transform';

export const transformExpression: NodeTransform = (node) => {
	if (node.type === NodeTypes.INTERPOLATION) {
		node.content = processExpression(node.content);
	}
};

export function processExpression(node: SimpleExpressionNode) {
	node.content = `_ctx.${node.content}`;
	return node;
}
