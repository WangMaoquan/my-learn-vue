import { CreateAppFunction, Renderer, createRenderer } from '@vue/runtime-core';
import { extend, isString, warn } from '@vue/shared';
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
	// 保存 app 本身的 mount
	const { mount } = app;
	app.mount = function (
		containerOrSelector: Element | ShadowRoot | string
	): any {
		const container = normalizeContainer(containerOrSelector);
		if (!container) return;
		container.innerHTML = '';
		const proxy = mount(container, container instanceof SVGElement);
		return proxy;
	};
	return app;
}) as CreateAppFunction<Element>;

function normalizeContainer(container: Element | ShadowRoot | string) {
	// 如果是 string 比如 #app
	if (isString(container)) {
		const res = document.querySelector(container);
		if (__DEV__ && !res) {
			warn(
				`Failed to mount app: mount target selector "${container}" returned null.`
			);
		}
		return res;
	}
	// about ShadowRoot https://developer.mozilla.org/zh-CN/docs/Web/API/ShadowRoot
	// 如果是 ShadowRoot 且 mode 为 close, close 是不能被 javascript 访问的 会出现问题
	if (
		__DEV__ &&
		window.ShadowRoot &&
		container instanceof window.ShadowRoot &&
		container.mode === 'closed'
	) {
		warn(
			`mounting on a ShadowRoot with \`{mode: "closed"}\` may lead to unpredictable bugs`
		);
	}
	return container as any;
}
