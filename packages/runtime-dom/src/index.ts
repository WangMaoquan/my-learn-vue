import { CreateAppFunction, Renderer, createRenderer } from '@vue/runtime-core';
import { extend } from '@vue/shared';
import { nodeOps } from './nodeOps';

// 这里是浏览器 的rendereroptions
const rendererOptions = extend({}, nodeOps);

// 多次调用createApp时 直接使用第一次创建的
let renderer: Renderer<Element | ShadowRoot>;

function ensureRenderer() {
	return (
		renderer ||
		(renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
	);
}

/**
 * 这个方法最主要的还是 是 通过 调用 renderer对象中的 createApp方法
 */
export const createApp = ((...args) => {
	const app = ensureRenderer().createApp(...args);
}) as CreateAppFunction<Element>;
