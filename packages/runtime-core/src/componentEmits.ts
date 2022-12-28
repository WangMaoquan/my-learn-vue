import { camelize, EMPTY_OBJ, toHandlerKey } from '@vue/shared';
import { ComponentInternalInstance } from './component';

export type ObjectEmitsOptions = Record<
	string,
	((...args: any[]) => any) | null
>;

export type EmitsOptions = ObjectEmitsOptions | string[];

export function emit(
	instance: ComponentInternalInstance,
	event: string,
	...rawArgs: any[]
) {
	if (instance.isUnmounted) return;
	const props = instance.vnode.props || EMPTY_OBJ;
	let handlerName;
	let handler =
		props[(handlerName = toHandlerKey(event))] ||
		props[(handlerName = toHandlerKey(camelize(event)))];

	handler(...rawArgs);
}
