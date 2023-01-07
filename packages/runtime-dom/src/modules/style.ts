import { camelize, capitalize, isArray, isString } from '@vue/shared';

type Style = string | Record<string, string | string[]> | null;

export function patchStyle(el: Element, prev: Style, next: Style) {
	const style = (el as HTMLElement).style; // 保存 el 上的 style
	const isCssString = isString(next); // 判断新的 style 是不是 字符串
	if (next && !isCssString) {
		// 说明是对象
		for (const key in next) {
			setStyle(style, key, next[key]);
		}
		// 之前的style, 且是对象形式
		if (prev && !isString(prev)) {
			for (const key in prev) {
				// 不存在新style中 需要重置
				if (next[key] == null) {
					setStyle(style, key, '');
				}
			}
		}
	} else {
		if (isCssString) {
			if (prev !== next) {
				// 直接 赋值 cssText
				style.cssText = next as string;
			}
		} else if (prev) {
			el.removeAttribute('style');
		}
	}
}

const semicolonRE = /[^\\];\s*$/;

function setStyle(
	style: CSSStyleDeclaration,
	name: string,
	val: string | string[]
) {
	if (isArray(val)) {
		val.forEach((v) => setStyle(style, name, v));
	} else {
		if (val == null) val = '';
		if (__DEV__) {
			// 字符串 但是没有 `;` 结尾
			if (semicolonRE.test(val)) {
				console.warn(
					`Unexpected semicolon at the end of '${name}' style value: '${val}'`
				);
			}
		}
		// 处理成可以带 Webkit Moz ms 的
		const prefixed = autoPrefix(style, name);
		style[prefixed as any] = val;
	}
}

const prefixes = ['Webkit', 'Moz', 'ms'];
const prefixCache: Record<string, string> = {};

function autoPrefix(style: CSSStyleDeclaration, rawName: string): string {
	// 先看是否有缓存
	const cached = prefixCache[rawName];
	if (cached) {
		return cached;
	}
	// 驼峰化
	let name = camelize(rawName);
	if (name in style) {
		return (prefixCache[rawName] = name);
	}
	// 首字母大写
	name = capitalize(name);
	for (let i = 0; i < prefixes.length; i++) {
		const prefixed = prefixes[i] + name;
		if (prefixed in style) {
			return (prefixCache[rawName] = prefixed);
		}
	}
	return rawName;
}
