export interface RootNode {
	children: any[];
}

/**
 * 创建 ast 的根节点
 */
export function createRoot(children: any[]): RootNode {
	return {
		children
	};
}
