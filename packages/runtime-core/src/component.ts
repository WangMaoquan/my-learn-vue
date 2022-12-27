import { isFunction } from '@vue/shared';
import { EmitsOptions } from './componentEmits';
import { ComponentOptions } from './componentOptions';
import { ComponentPublicInstance } from './componentPublicInstance';
import { Slots } from './componentSlots';

export type Data = Record<string, unknown>;
export interface Component {}
export type ConcreteComponent = {};
export interface ComponentInternalInstance {}

export interface ClassComponent {
	new (...args: any[]): ComponentPublicInstance<any, any, any, any, any>;
	__vccOpts: ComponentOptions;
}

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
