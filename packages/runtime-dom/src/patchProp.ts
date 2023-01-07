import { patchClass } from './modules/class';
import { RendererOptions } from '@vue/runtime-core';
import { patchStyle } from './modules/style';

type DOMRendererOptions = RendererOptions<Node, Element>;

export const patchProp: DOMRendererOptions['patchProp'] = (
	el,
	key,
	prevValue,
	nextValue,
	isSVG = false,
	prevChildren,
	parentComponent
) => {
	if (key === 'class') {
		patchClass(el, nextValue, isSVG);
	} else if (key === 'style') {
		patchStyle(el, prevValue, nextValue);
	}
	// todo props, attrs
};
