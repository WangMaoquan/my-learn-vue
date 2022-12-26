import { createAppAPI, CreateAppFunction } from './apiCreateApp';
import { VNode, VNodeProps } from './vnode';

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
	// 插入DOM元素 的方法
	insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void;
	// 删除DOM 元素的方法
	remove(el: HostNode): void;
	// 创建 DOM 元素的方法
	createElement(
		type: string,
		isSVG?: boolean,
		isCustomizedBuiltIn?: string,
		vnodeProps?: (VNodeProps & { [key: string]: any }) | null
	): HostElement;
	// 创建文本元素的方法
	createText(text: string): HostNode;
	// 创建注释节点的方法
	createComment(text: string): HostNode;
	// 修改文本的方法
	setText(node: HostNode, text: string): void;
	// 修改元素文本的方法
	setElementText(node: HostElement, text: string): void;
	// 获取父级节点的方法
	parentNode(node: HostNode): HostElement | null;
	// 获取兄弟节点的方法
	nextSibling(node: HostNode): HostNode | null;
	// 根据 id/class ...  选择器获取 DOM 的放
	querySelector?(selector: string): HostElement | null;
	//  设置 scopeId
	setScopeId?(el: HostElement, id: string): void;
	// 克隆DOM 的方法
	cloneNode?(node: HostNode): HostNode;
	// 插入静态内容的方法
	insertStaticContent?(
		content: string,
		parent: HostElement,
		anchor: HostNode | null,
		isSVG: boolean,
		start?: HostNode | null,
		end?: HostNode | null
	): [HostNode, HostNode];
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
>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>;

function baseCreateRenderer<
	HostNode = RendererNode,
	HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>): any {
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
	};
}
