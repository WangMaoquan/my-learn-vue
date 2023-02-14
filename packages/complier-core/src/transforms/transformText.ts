import {
	CompoundExpressionNode,
	createCompoundExpression,
	NodeTypes
} from '../ast';
import { NodeTransform } from '../transform';
import { isText } from '../utils';

/***
 * 将 elementNode children 中 连续的 text 和 插值 合并成一个 CompoundExpressionNode
 */
export const transformText: NodeTransform = (node) => {
	if (node.type === NodeTypes.ELEMENT) {
		return () => {
			const children = node.children;
			let currentContainer: CompoundExpressionNode | undefined = undefined;

			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				if (isText(child)) {
					// 判断是否是 text 或者 interpolation
					for (let j = i + 1; j < children.length; j++) {
						const next = children[j]; // i+1 相邻的child
						if (isText(next)) {
							// 判断是否是 text / interpolation
							if (!currentContainer) {
								// 只有在为undefined 才初始化
								// 记得要修改 children[i] 位置
								currentContainer = children[i] = createCompoundExpression([
									child
								]);
							}
							currentContainer.children.push(` + `, next);
							children.splice(j, 1); // j 符合是要被删除
							j--; // 删除了后面会提前 所以需要 j--
						} else {
							currentContainer = undefined; // 不满足 重置
							break;
						}
					}
				}
			}
		};
	}
};
