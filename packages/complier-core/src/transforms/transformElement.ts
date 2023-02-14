import { createVNodeCall, NodeTypes } from '../ast';
import { CREATE_ELEMENT_VNODE } from '../runtimeHelpers';
import { NodeTransform } from '../transform';

export const transformElement: NodeTransform = (node, context) => {
	if (node.type === NodeTypes.ELEMENT) {
		return () => {
			context.helpers.set(CREATE_ELEMENT_VNODE, 1);

			node.codegenNode = createVNodeCall(
				context,
				`'${node.tag}'`,
				undefined,
				node.children
			);
		};
	}
};
