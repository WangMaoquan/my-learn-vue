import { isFunction, makeMap, NO } from '@vue/shared';
import { AppConfig } from './apiCreateApp';
import { EmitsOptions } from './componentEmits';
import { ComponentOptions } from './componentOptions';
import { ComponentPublicInstance } from './componentPublicInstance';
import { Slots } from './componentSlots';

export type Data = Record<string, unknown>;
export interface Component {}
export type ConcreteComponent = {};
export interface ComponentInternalInstance {}

export interface ClassComponent {
	new (...args: any[]): ComponentPublicInstance<any, any, any>;
	__vccOpts: ComponentOptions;
}

export interface AllowedComponentProps {
	class?: unknown;
	style?: unknown;
}

export interface ComponentCustomProps {}

export type SetupContext<E = EmitsOptions> = E extends any
	? {
			attrs: Data;
			slots: Slots;
			emit: Function;
			expose: (exposed?: Record<string, any>) => void;
	  }
	: never;

export function isClassComponent(value: unknown): value is ClassComponent {
	return isFunction(value) && '__vccOpts' in value;
}

// slot 和 component 是内置的
const isBuiltInTag = makeMap('slot,component');

export function validateComponentName(name: string, config: AppConfig) {
	const appIsNativeTag = config.isNativeTag || NO;
	if (isBuiltInTag(name) || appIsNativeTag(name)) {
		console.warn(
			'Do not use built-in or reserved HTML elements as component id: ' + name
		);
	}
}
