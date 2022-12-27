import { EmitsOptions } from './componentEmits';

export type ComponentPublicInstance<
	P = {}, // props
	B = {}, // setup
	E extends EmitsOptions = {} // emit 属性
> = {};

export type CreateComponentPublicInstance<
	P = {},
	B = {},
	E extends EmitsOptions = {}
> = ComponentPublicInstance<P, B, E>;

export type ComponentPublicInstanceConstructor<
	T extends ComponentPublicInstance<
		Props,
		RawBindings
	> = ComponentPublicInstance<any>,
	Props = any,
	RawBindings = any
> = {
	__isFragment?: never;
	__isTeleport?: never;
	__isSuspense?: never;
	new (...args: any[]): T;
};
