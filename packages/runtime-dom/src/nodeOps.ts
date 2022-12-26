import { RendererOptions } from '@vue/runtime-core';

// svg namespace
export const svgNS = 'http://www.w3.org/2000/svg';

// 获取的document对象
const doc = (typeof document !== 'undefined' ? document : null) as Document;

export const nodeOps: RendererOptions<Node, Element> = {
	insert(child, parent, anchor) {
		parent.insertBefore(child, anchor || null);
	},
	remove(child) {
		const parent = child.parentNode;
		if (parent) {
			parent.removeChild(child);
		}
	},
	createElement(tag, isSVG, is, props) {
		const el = isSVG
			? doc.createElementNS(svgNS, tag)
			: doc.createElement(tag, is ? { is } : undefined);

		return el;
	}
};
