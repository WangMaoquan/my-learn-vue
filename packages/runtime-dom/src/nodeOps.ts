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
	},
	createComment(text) {
		return doc.createComment(text);
	},
	createText(text) {
		return doc.createTextNode(text);
	},
	setElementText(el, text) {
		el.textContent = text;
	},
	setText(node, text) {
		node.nodeValue = text;
	},
	parentNode(node) {
		return node.parentNode as Element | null;
	},
	nextSibling(node) {
		return node.nextSibling as Element | null;
	},
	querySelector(selector) {
		return doc.querySelector(selector);
	},
	setScopeId(el, id) {
		el.setAttribute(id, '');
	}
};
