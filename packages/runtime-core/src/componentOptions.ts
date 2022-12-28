import { ComputedGetter, WritableComputedOptions } from '@vue/reactivity';
import { LooseRequired } from '@vue/shared';
import { Component, SetupContext } from './component';
import { EmitsOptions } from './componentEmits';
import { CreateComponentPublicInstance } from './componentPublicInstance';
import { Directive } from './directives';
import { VNodeChild } from './vnode';

export let shouldCacheAccess = true;
export type ComponentOptions<
	Props = {},
	RawBindings = any,
	E extends EmitsOptions = any
> = ComponentOptionsBase<Props, RawBindings, E> &
	ThisType<CreateComponentPublicInstance<Readonly<Props>, RawBindings, E>>;
export type ComputedOptions = Record<
	string,
	ComputedGetter<any> | WritableComputedOptions<any>
>;

export interface MethodOptions {
	[key: string]: Function;
}

type ObjectInjectOptions = Record<
	string | symbol,
	string | symbol | { from?: string | symbol; default?: unknown }
>;

export type ComponentProvideOptions = ObjectProvideOptions | Function;

type ObjectProvideOptions = Record<string | symbol, unknown>;

export type ComponentInjectOptions = string[] | ObjectInjectOptions;

export type ComponentOptionsMixin = ComponentOptionsBase<any, any, any>;

export interface ComponentCustomOptions {}

export type RenderFunction = () => VNodeChild;

/**
 * 组件基本属性
 */
export interface ComponentOptionsBase<
	Props,
	RawBindings,
	E extends EmitsOptions
> extends ComponentCustomOptions {
	// 使用setup
	setup?: (
		this: void,
		props: Readonly<LooseRequired<Props>>,
		ctx: SetupContext<E>
	) => Promise<RawBindings> | RawBindings | RenderFunction | void;
	name?: string; // 组件名称
	template?: string | object; // 是否包含模板
	render?: Function; // 是否含有render 方法
	components?: Record<string, Component>; // 子组件
	directives?: Record<string, Directive>; // 指令
	inheritAttrs?: boolean; // 是否继承属性
	emits?: E & ThisType<void>; // emit
	expose?: string[]; // 暴露出去的方法
}

export type ComponentOptionsWithoutProps<
	Props = {},
	RawBindings = {},
	E extends EmitsOptions = EmitsOptions
> = ComponentOptionsBase<Props, RawBindings, E> & {
	props?: undefined;
} & ThisType<CreateComponentPublicInstance<Props, RawBindings, E>>;

export type ComponentOptionsWithArrayProps<
	PropNames extends string = string,
	RawBindings = {},
	E extends EmitsOptions = EmitsOptions,
	Props = Readonly<{ [key in PropNames]?: any }>
> = ComponentOptionsBase<Props, RawBindings, E> & {
	props: PropNames[];
} & ThisType<CreateComponentPublicInstance<Props, RawBindings, E>>;
