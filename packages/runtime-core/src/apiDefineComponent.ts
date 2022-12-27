import { AllowedComponentProps, ComponentCustomProps } from './component';
import { EmitsOptions } from './componentEmits';
import {
	ComponentOptionsBase,
	ComponentOptionsWithArrayProps,
	ComponentOptionsWithoutProps
} from './componentOptions';
import { ComponentPropsOptions, ExtractPropTypes } from './componentProps';
import { VNodeProps } from './vnode';

export type PublicProps = VNodeProps &
	AllowedComponentProps &
	ComponentCustomProps;

export type DefineComponent<
	PropsOrPropOptions = {},
	RawBindings = {},
	E extends EmitsOptions = {},
	Props = Readonly<
		PropsOrPropOptions extends ComponentPropsOptions
			? ExtractPropTypes<PropsOrPropOptions>
			: PropsOrPropOptions
	>
> = ComponentOptionsBase<Props, RawBindings, E>;

/**
 * 没有props
 */
export function defineComponent<
	Props = {},
	RawBindings = {},
	E extends EmitsOptions = {}
>(
	options: ComponentOptionsWithoutProps<Props, RawBindings, E>
): DefineComponent<Props, RawBindings, E>;

/**
 * props: ["xxx"]
 */
export function defineComponent<
	PropNames extends string,
	RawBindings,
	E extends EmitsOptions = {}
>(
	options: ComponentOptionsWithArrayProps<PropNames, RawBindings, E>
): DefineComponent<Readonly<{ [key in PropNames]?: any }>, RawBindings, E>;

export function defineComponent(options: unknown) {
	return options;
}
