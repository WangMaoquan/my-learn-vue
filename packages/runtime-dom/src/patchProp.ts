import { patchClass } from './modules/class';
import { RendererOptions } from '@vue/runtime-core';

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
	}
	// todo style
};
