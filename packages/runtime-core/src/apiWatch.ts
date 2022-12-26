type OnCleanup = (cleanupFn: () => void) => void;

export type WatchCallback<V = any, OV = any> = (
	value: V,
	oldValue: OV,
	onCleanup: OnCleanup
) => any;

export interface WatchOptionsBase {
	flush?: 'pre' | 'post' | 'sync'; // 调度
}

export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
	immediate?: Immediate; // 是否立即执行
	deep?: boolean; // 是否深度监听
}
