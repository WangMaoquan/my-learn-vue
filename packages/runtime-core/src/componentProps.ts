import { Data } from './component';

// 暂时就是实现 ["xxx", "xxx"] 这样的
export type ComponentPropsOptions = string[];

export type ExtractPropTypes<O> = {
	[K in keyof O]: O[K];
};

export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;

type DefaultFactory<T> = (props: Data) => T | null | undefined;

/**
 * vue2.x 中定义props 的对象类型
 */
export interface PropOptions<T = any, D = T> {
	type?: PropType<T> | true | null; // props 的type
	required?: boolean; // 是否必须
	default?: D | DefaultFactory<D> | null | undefined | object; // 默认值
	validator?(value: unknown): boolean; // 校验值是否满足
}

/**
 * {
 * 	type: String
 * }
 * {
 * 	type: [String, Number]
 * }
 */
export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];

type PropConstructor<T = any> = { new (...args: any[]): T & {} } | { (): T };

type NormalizedProp = null | PropOptions;

export type NormalizedProps = Record<string, NormalizedProp>;
export type NormalizedPropsOptions = [NormalizedProps, string[]] | [];
