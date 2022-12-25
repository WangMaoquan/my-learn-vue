import { createAppAPI, CreateAppFunction } from './apiCreateApp';
import { VNode } from './vnode';

export interface RendererNode {
	[key: string]: any;
}

export interface RendererElement extends RendererNode {}

/**
 * 生成renderer的options
 * 里面包含的是不同平台实现的
 * 插入元素 / 删除元素的方法
 */
export interface RendererOptions<
	HostNode = RendererNode,
	HostElement = RendererElement
> {
	// 我这里先为了让eslint 通过随便写的俩
	host: HostNode;
	hostE: HostElement;
}

/**
 * 生成renderer 的方法
 * @param options 平台相关的方法
 * @returns
 */
export function createRenderer<
	HostNode = RendererNode,
	HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {
	return baseCreateRenderer(options);
}

/**
 * 根组件的render方法
 */
export type RootRenderFunction<HostElement = RendererElement> = (
	vnode: VNode | null, // vnode
	container: HostElement, // 实际挂载的位置
	isSVG?: boolean // 是否是svg元素
) => void;

/**
 * renderer 包好一个render方法 和 createApp 方法
 * 这个createApp 方法 就是返回的我们的app 对象
 */
export interface Renderer<HostElement = RendererElement> {
	render: RootRenderFunction<HostElement>;
	createApp: CreateAppFunction<HostElement>;
}

function baseCreateRenderer<
	HostNode = RendererNode,
	HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {
	const render: RootRenderFunction = (vnode, container, isSVG) => {
		if (vnode == null) {
			// 卸载
		} else {
			// 挂载 patch
		}
	};

	return {
		render,
		createApp: createAppAPI(render)
	} as Renderer<HostElement>;
}
