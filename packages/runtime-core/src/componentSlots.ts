import { VNode } from './vnode';

// 返回一个VNode[]
export type Slot = (...args: any[]) => VNode[];

export type InternalSlots = {
	[name: string]: Slot | undefined;
};

export type Slots = Readonly<InternalSlots>;
