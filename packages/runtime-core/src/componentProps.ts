import { IfAny } from '@vue/shared';

// 暂时就是实现 ["xxx", "xxx"] 这样的
export type ComponentPropsOptions = string[];

export type ExtractPropTypes<O> = {
	[K in keyof O]: O[K];
};
