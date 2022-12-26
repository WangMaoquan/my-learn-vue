import { ComputedGetter, WritableComputedOptions } from '@vue/reactivity';
import { LooseRequired, UnionToIntersection } from '@vue/shared';
import { WatchCallback, WatchOptions } from './apiWatch';
import { Component, SetupContext } from './component';
import { EmitsOptions } from './componentEmits';
import { CreateComponentPublicInstance } from './componentPublicInstance';
import { Directive } from './directives';
import { VNodeChild } from './vnode';

export type ComponentOptions = {
	name: string;
};

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

export type ObjectWatchOptionItem = {
	handler: WatchCallback | string;
} & WatchOptions;

type WatchOptionItem = string | WatchCallback | ObjectWatchOptionItem;

type ComponentWatchOptionItem = WatchOptionItem | WatchOptionItem[];

type ComponentWatchOptions = Record<string, ComponentWatchOptionItem>;

export type ComponentProvideOptions = ObjectProvideOptions | Function;

type ObjectProvideOptions = Record<string | symbol, unknown>;

export type ComponentInjectOptions = string[] | ObjectInjectOptions;

export type ComponentOptionsMixin = ComponentOptionsBase<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

// optionApi 的属性
interface LegacyOptions<
	Props,
	D,
	C extends ComputedOptions,
	M extends MethodOptions,
	Mixin extends ComponentOptionsMixin,
	Extends extends ComponentOptionsMixin,
	I extends ComponentInjectOptions,
	II extends string
> {
	[key: string]: any;

	data?: (
		this: CreateComponentPublicInstance<
			Props,
			{},
			{},
			{},
			MethodOptions,
			Mixin,
			Extends
		>,
		vm: CreateComponentPublicInstance<
			Props,
			{},
			{},
			{},
			MethodOptions,
			Mixin,
			Extends
		>
	) => D;
	computed?: C;
	methods?: M;
	watch?: ComponentWatchOptions;
	provide?: ComponentProvideOptions;
	inject?: I | II[];

	// assets
	filters?: Record<string, Function>;

	// composition
	mixins?: Mixin[];
	extends?: Extends;

	// lifecycle
	beforeCreate?(): void;
	created?(): void;
	beforeMount?(): void;
	mounted?(): void;
	beforeUpdate?(): void;
	updated?(): void;
	activated?(): void;
	deactivated?(): void;
	beforeDestroy?(): void;
	beforeUnmount?(): void;
	destroyed?(): void;
	unmounted?(): void;
}

export interface ComponentCustomOptions {}

type ExtractOptionProp<T> = T extends ComponentOptionsBase<
	infer P, // Props
	any, // RawBindings
	any, // D
	any, // C
	any, // M
	any, // Mixin
	any, // Extends
	any // EmitsOptions
>
	? unknown extends P
		? {}
		: P
	: {};

export type RenderFunction = () => VNodeChild;

export interface ComponentOptionsBase<
	Props,
	RawBindings,
	D,
	C extends ComputedOptions,
	M extends MethodOptions,
	Mixin extends ComponentOptionsMixin,
	Extends extends ComponentOptionsMixin,
	E extends EmitsOptions,
	EE extends string = string,
	Defaults = {},
	I extends ComponentInjectOptions = {},
	II extends string = string
> extends LegacyOptions<Props, D, C, M, Mixin, Extends, I, II>,
		ComponentCustomOptions {
	setup?: (
		this: void,
		props: Readonly<
			LooseRequired<
				Props &
					UnionToIntersection<ExtractOptionProp<Mixin>> &
					UnionToIntersection<ExtractOptionProp<Extends>>
			>
		>,
		ctx: SetupContext<E>
	) => Promise<RawBindings> | RawBindings | RenderFunction | void;
	name?: string;
	template?: string | object;
	render?: Function;
	components?: Record<string, Component>;
	directives?: Record<string, Directive>;
	inheritAttrs?: boolean;
	emits?: (E | EE[]) & ThisType<void>;
	expose?: string[];
}
