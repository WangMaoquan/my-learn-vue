import { RendererOptions } from '@vue/runtime-core';

export const nodeOps: RendererOptions<Node, Element> = {
	hostE: 'test1' as any,
	host: 'test2' as any
};
