import { ComponentInternalInstance } from './component';

export let currentRenderingInstance: ComponentInternalInstance | null = null;
export let currentScopeId: string | null = null;

export function setCurrentRenderingInstance(
	instance: ComponentInternalInstance | null
): ComponentInternalInstance | null {
	const prev = currentRenderingInstance;
	currentRenderingInstance = instance;
	return prev;
}
