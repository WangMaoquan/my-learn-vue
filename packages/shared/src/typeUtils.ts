export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

export type LooseRequired<T> = { [P in keyof (T & Required<T>)]: T[P] };

export type UnionToIntersection<U> = (
	U extends any ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never;
