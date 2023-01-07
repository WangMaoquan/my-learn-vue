import { makeMap } from './makeMap';

export { makeMap };
export * from './typeUtils';
export * from './warning';
export * from './patchFlags';
export * from './shapeFlags';

export const NOOP = () => {};

export const NO = () => false;

export const EMPTY_OBJ: { readonly [key: string]: any } = __DEV__
	? Object.freeze({})
	: {};

export const isArray = Array.isArray;

export const isString = (val: unknown): val is string =>
	typeof val === 'string';

export const isNumber = (val: unknown): val is number =>
	typeof val === 'number';

export const isSymbol = (val: unknown): val is symbol =>
	typeof val === 'symbol';

export const isIntegerKey = (key: unknown) =>
	isString(key) &&
	key !== 'NaN' &&
	key[0] !== '-' &&
	'' + parseInt(key, 10) === key;

export const isObject = (val: unknown): val is Record<any, any> =>
	val !== null && typeof val === 'object';

export const isFunction = (val: unknown): val is Function =>
	typeof val === 'function';

const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (
	val: object,
	key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key);

export const hasChanged = (value: any, oldValue: any): boolean =>
	!Object.is(value, oldValue);

export const extend = Object.assign;

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string =>
	objectToString.call(value);
export const toRawType = (value: unknown) => toTypeString(value).slice(8, -1);

export const isMap = (value: unknown): value is Map<any, any> =>
	toTypeString(value) === '[object Map]';

export const isSet = (value: unknown): value is Set<any> =>
	toTypeString(value) === '[object Set]';

export const def = (obj: object, key: string | symbol, value: unknown) => {
	Object.defineProperty(obj, key, {
		configurable: true,
		enumerable: false,
		value
	});
};

const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
	const cache: Record<string, string> = Object.create(null);
	return ((str: string) => {
		const hit = cache[str];
		return hit || (cache[str] = fn(str));
	}) as T;
};

export const capitalize = cacheStringFunction(
	(str: string) => str.charAt(0).toUpperCase() + str.slice(1)
);

export const toHandlerKey = cacheStringFunction((str: string) =>
	str ? `on${capitalize(str)}` : ``
);

const camelizeRE = /-(\w)/g;
//  驼峰写法
export const camelize = cacheStringFunction((str: string): string => {
	return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
});

const hyphenateRE = /\B([A-Z])/g;
// 连字符
export const hyphenate = cacheStringFunction((str: string) =>
	str.replace(hyphenateRE, '-$1').toLowerCase()
);

export const invokeArrayFns = (fns: Function[], arg?: any) => {
	for (let i = 0; i < fns.length; i++) {
		fns[i](arg);
	}
};
