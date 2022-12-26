import { EmitsOptions } from './componentEmits';
import {
	ComponentInjectOptions,
	ComponentOptionsBase,
	ComponentOptionsMixin,
	ComputedOptions,
	MethodOptions
} from './componentOptions';

export type ComponentPublicInstance<
	P = {}, // props
	B = {}, // setup
	D = {}, // data
	C extends ComputedOptions = {}, // computed
	M extends MethodOptions = {}, // methods
	E extends EmitsOptions = {}, // emit 属性
	PublicProps = P,
	Defaults = {},
	MakeDefaultsOptional extends boolean = false,
	Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>, // component的基本属性
	I extends ComponentInjectOptions = {} // inject
> = {};

export type CreateComponentPublicInstance<
	P = {},
	B = {},
	D = {},
	C extends ComputedOptions = {},
	M extends MethodOptions = {},
	Mixin extends ComponentOptionsMixin = ComponentOptionsMixin,
	Extends extends ComponentOptionsMixin = ComponentOptionsMixin,
	E extends EmitsOptions = {},
	Defaults = {},
	I extends ComponentInjectOptions = {}
> = ComponentPublicInstance<
	P,
	B,
	D,
	C,
	M,
	E,
	P,
	{},
	false,
	ComponentOptionsBase<P, B, D, C, M, Mixin, Extends, E, string, Defaults>,
	I
>;
