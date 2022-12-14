import { ReactiveEffect } from '@vue/reactivity';
import {
	EMPTY_OBJ,
	invokeArrayFns,
	isFunction,
	ShapeFlags,
	isArray
} from '@vue/shared';
import { createAppAPI, CreateAppFunction } from './apiCreateApp';
import {
	ComponentInternalInstance,
	createComponentInstance,
	setupComponent
} from './component';
import { renderComponentRoot } from './componentRenderUtils';
import { SchedulerJob } from './scheduler';
import {
	normalizeVNode,
	VNode,
	VNodeArrayChildren,
	VNodeHook,
	VNodeProps
} from './vnode';

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
	patchProp(
		el: HostElement,
		key: string,
		prevValue: any,
		nextValue: any,
		isSVG?: boolean,
		prevChildren?: VNode<HostNode, HostElement>[],
		parentComponent?: ComponentInternalInstance | null
	): void;
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

// patch
type PatchFn = (
	n1: VNode | null, // null 就是 挂载, 旧vnode
	n2: VNode, // 新 vnode
	container: RendererElement,
	anchor?: RendererNode | null,
	parentComponent?: ComponentInternalInstance | null,
	isSVG?: boolean
) => void;

// processText
type ProcessTextFn = (
	n1: VNode | null,
	n2: VNode,
	container: RendererElement,
	anchor: RendererNode | null
) => void;

type ProcessComponentFn = (
	n1: VNode | null,
	n2: VNode,
	container: RendererElement,
	anchor: RendererNode | null,
	parentComponent: ComponentInternalInstance | null,
	isSVG: boolean
) => void;

export type MountComponentFn = (
	initialVNode: VNode,
	container: RendererElement,
	anchor: RendererNode | null,
	parentComponent: ComponentInternalInstance | null,
	isSVG: boolean
) => void;

export type SetupRenderEffectFn = (
	instance: ComponentInternalInstance,
	initialVNode: VNode,
	container: RendererElement,
	anchor: RendererNode | null,
	isSVG: boolean
) => void;

type MountChildrenFn = (
	children: VNodeArrayChildren,
	container: RendererElement,
	anchor: RendererNode | null,
	parentComponent: ComponentInternalInstance | null,
	isSVG: boolean,
	start?: number
) => void;

type PatchChildrenFn = (
	n1: VNode | null,
	n2: VNode,
	container: RendererElement,
	anchor: RendererNode | null,
	parentComponent: ComponentInternalInstance | null,
	isSVG: boolean
) => void;

type UnmountFn = (
	vnode: VNode,
	parentComponent: ComponentInternalInstance | null,
	doRemove?: boolean
) => void;

type UnmountChildrenFn = (
	children: VNode[],
	parentComponent: ComponentInternalInstance | null,
	doRemove?: boolean,
	start?: number
) => void;

type MoveFn = (
	vnode: VNode,
	container: RendererElement,
	anchor: RendererNode | null
) => void;

type RemoveFn = (vnode: VNode) => void;

function baseCreateRenderer<
	HostNode = RendererNode,
	HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>;

function baseCreateRenderer<
	HostNode = RendererNode,
	HostElement = RendererElement
>(options: RendererOptions): any {
	const {
		insert: hostInsert,
		createText: hostCreateText,
		setText: hostSetText,
		createElement: hostCreateElement,
		setElementText: hostSetElementText,
		patchProp: hostPatchProp,
		remove: hostRemove
	} = options;

	const processText: ProcessTextFn = (n1, n2, container, anchor) => {
		if (n1 == null) {
			// 挂载
			hostInsert(
				(n2.el = hostCreateText(n2.children as string)),
				container,
				anchor
			);
		} else {
			// 更新
			const el = (n2.el = n1.el!);
			if (n2.children !== n1.children) {
				hostSetText(el, n2.children as string);
			}
		}
	};

	const mountChildren: MountChildrenFn = (
		children,
		container,
		anchor,
		parentComponent,
		isSVG,
		start = 0
	) => {
		for (let i = start; i < children.length; i++) {
			const child = (children[i] = normalizeVNode(children[i]));
			patch(null, child, container, anchor, parentComponent, isSVG);
		}
	};

	const mountElement = (
		vnode: VNode,
		container: RendererElement,
		anchor: RendererNode | null,
		parentComponent: ComponentInternalInstance | null,
		isSVG: boolean
	) => {
		let el: RendererElement;
		const { props, shapeFlag } = vnode;

		el = vnode.el = hostCreateElement(
			vnode.type as string,
			isSVG,
			props && props.is,
			props
		);

		// 需要先挂载children
		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			hostSetElementText(el, vnode.children as string);
		} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			mountChildren(
				vnode.children as VNodeArrayChildren,
				el,
				null,
				parentComponent,
				isSVG
			);
		}
		/**
		 * 处理指令
		 * 处理 hook
		 * 处理props
		 */

		if (props) {
			for (const key in props) {
				hostPatchProp(
					el,
					key,
					null,
					props[key],
					isSVG,
					vnode.children as VNode[],
					parentComponent
				);
			}
		}

		hostInsert(el, container, anchor);
	};

	const move: MoveFn = (vnode, container, anchor) => {
		const { el, children } = vnode;

		// todo 不同的类型
		if (isArray(children)) {
			hostInsert(el!, container, anchor);
			for (let i = 0; i < (children as VNode[]).length; i++) {
				move((children as VNode[])[i], container, anchor);
			}
			hostInsert(vnode.anchor!, container, anchor);
			return;
		}

		hostInsert(el!, container, anchor);
	};

	const remove: RemoveFn = (vnode) => {
		const { children } = vnode;
		const removeArr = isArray(children) ? children : [children];
		(removeArr as VNode[]).forEach((child) => {
			if (child.type === Comment) {
				hostRemove(child.el!);
			} else {
				remove(child);
			}
		});
	};

	const unmount: UnmountFn = (vnode, parentComponent, doRemove = false) => {
		/**
		 * 1. 调用beforeUnmount
		 * 2. 卸载children
		 * 3. 子节点卸载完, 再删除当前的
		 * 4. unmounted 钩子
		 */
		const { props, children } = vnode;

		let vnodeHook: VNodeHook | undefined | null;
		if ((vnodeHook = props && props.onVnodeBeforeUnmount)) {
			if (isArray(vnodeHook)) {
				vnodeHook.forEach((hook) => hook(vnode, null as any));
			}
		}

		unmountChildren(children as VNode[], parentComponent);

		if (doRemove) {
			remove(vnode);
		}

		if ((vnodeHook = props && props.onVnodeUnmounted)) {
			if (isArray(vnodeHook)) {
				vnodeHook.forEach((hook) => hook(vnode, null as any));
			}
		}
	};

	const unmountChildren: UnmountChildrenFn = (
		children,
		parentComponent,
		doRemove = false,
		start = 0
	) => {
		// 对每个vnode 执行unmount方法
		for (let i = start; i < children.length; i++) {
			unmount(children[i], parentComponent, doRemove);
		}
	};

	const patchChildren: PatchChildrenFn = (
		n1,
		n2,
		container,
		anchor,
		parentComponent,
		isSVG
	) => {
		const c1 = n1 && n1.children;
		const prevShapeFlag = n1 ? n1.shapeFlag : 0;
		const c2 = n2.children;

		const { shapeFlag } = n2;

		// todo 多个子vnode
		if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
			// 当前的是个文本, 但是之前的 有多个child
			if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// todo 卸载以前的children
				unmountChildren(c1 as VNode[], parentComponent);
			}
			// 不是相同文本 直接替换
			if (c2 !== c1) {
				hostSetElementText(container, c2 as string);
			}
		}
	};

	const patchElement = (
		n1: VNode,
		n2: VNode,
		parentComponent: ComponentInternalInstance | null,
		isSVG: boolean
	) => {
		const el = (n2.el = n1.el!);
		const oldProps = n1.props || EMPTY_OBJ;
		const newProps = n2.props || EMPTY_OBJ;
		let vnodeHook: VNodeHook | null | undefined;

		if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
			if (isArray(vnodeHook)) {
				vnodeHook.forEach((hook) => hook(n1, n2));
			} else {
				vnodeHook(n1, n2);
			}
		}

		// todo patch children
		patchChildren(n1, n2, el, null, parentComponent, isSVG);

		// todo patch props
		oldProps;
	};

	const processElement = (
		n1: VNode | null,
		n2: VNode,
		container: RendererElement,
		anchor: RendererNode | null,
		parentComponent: ComponentInternalInstance | null,
		isSVG: boolean
	) => {
		isSVG = isSVG || (n2.type as string) === 'svg';
		if (n1 == null) {
			// 挂载
			mountElement(n2, container, anchor, parentComponent, isSVG);
		} else {
			// 更新 元素节点
			/**
			 * 1. 调用 beforeUpdate 钩子
			 * 2. patch children
			 * 3. patch props
			 * 4. 调用 updated 钩子
			 */
			patchElement(n1, n2, parentComponent, isSVG);
		}
	};

	const mountComponent: MountComponentFn = (
		initialVNode,
		container,
		anchor,
		parentComponent,
		isSVG
	) => {
		// 创建组件instance 并赋值给 vnode.component
		const instance: ComponentInternalInstance = (initialVNode.component =
			createComponentInstance(initialVNode, parentComponent));

		/**
		 * 这个方法主要做的是
		 * 1. 初始化props/ slots(待)
		 * 2. 然后 通过 setupStatefulComponent 初始化 instance 上的proxy,accessCache,
		 * 		把props代理到ctx上, 判断有无 setup, 有就执行setup, 然后判断setupResult 是方法 还是对象,
		 * 		方法就作为instance的render, 判断是否是对象(vnode 会被发出警告), 作为instance上setupState 赋值
		 * 		然后将 setupResult 代理到 ctx上, 最后执行的是 finishComponent方法, 主要处理的是不存在render, 和 处理optionApi那一套的逻辑
		 */
		setupComponent(instance);

		// 初始化 renderEffect
		setupRenderEffect(instance, initialVNode, container, anchor, isSVG);
	};

	/**
	 * 初始化 component renderEffect 的方法
	 * @param instance 当前实例
	 * @param initialVNode mount的vnode
	 * @param container 挂载的元素
	 * @param anchor 挂载目标
	 * @param isSVG 是否是svg
	 */
	const setupRenderEffect: SetupRenderEffectFn = (
		instance,
		initialVNode,
		container,
		anchor,
		isSVG
	) => {
		// 传给 reactiveEffect 的fn
		const componentUpdateFn = () => {
			if (!instance.isMounted) {
				/**
				 * 挂载
				 * 1. 调用beforeMount emmm instance上还没有给生命周期留位置 回头补上
				 * 2. 调用vnode 上面的 beforeMount
				 * 3. 执行render
				 * 4. 调用mounted钩子
				 * 5. 修改isMounted为true
				 */
				let vnodeHook: VNodeHook | null | undefined;
				const { props } = initialVNode;
				const { bm, m, parent } = instance;
				toggleRecurse(instance, false);
				// 触发 beforemount
				if (bm) {
					invokeArrayFns(bm);
				}
				// vnode 的 onVnodeBeforeMount
				if ((vnodeHook = props && props.onVnodeBeforeMount)) {
					if (isFunction(vnodeHook)) {
						vnodeHook(parent as any, initialVNode);
					} else {
						vnodeHook.forEach((hook) => {
							hook(parent as any, initialVNode);
						});
					}
				}
				toggleRecurse(instance, true);
				const subTree = (instance.subTree = renderComponentRoot(instance));
				patch(null, subTree, container, anchor, instance, isSVG);
				initialVNode.el = subTree.el;
				// mounted
				if (m) {
					invokeArrayFns(m);
				}
				// vnode 的 onVnodeMounted
				if ((vnodeHook = props && props.onVnodeMounted)) {
					if (isFunction(vnodeHook)) {
						vnodeHook(parent as any, initialVNode);
					} else {
						vnodeHook.forEach((hook) => {
							hook(parent as any, initialVNode);
						});
					}
				}
				instance.isMounted = true;
				initialVNode = container = anchor = null as any;
			} else {
				/**
				 * 更新
				 */
			}
		};

		// 创建 组件的render effect 并将update 作为scheduler 传入
		const effect = (instance.effect = new ReactiveEffect(
			componentUpdateFn,
			() => update // todo 需要用调度来, 但是我还没实现
		));

		// 组件更新调用的方法
		const update: SchedulerJob = (instance.update = () => effect.run());
		// 组件的创建顺序一定是 先父后子, 所以执行副作用的时候 也一定是id小的在前面, 所以 update.id 直接用 instance的uid
		update.id = instance.uid;

		// 然后我们需要手动执行下
		update();
	};

	const updateComponent = () => {};

	const processComponent: ProcessComponentFn = (
		n1,
		n2,
		container,
		anchor,
		parentComponent,
		isSVG
	) => {
		if (n1 == null) {
			// 挂载
			mountComponent(n2, container, anchor, parentComponent, isSVG);
		} else {
			// 更新
			updateComponent();
		}
	};

	/**
	 * 主要做的 根据新vnode 的类型 执行不同的 process 操作
	 */
	const patch: PatchFn = (
		n1,
		n2,
		container,
		anchor = null,
		parentComponent = null,
		isSVG = false
	) => {
		const { type, shapeFlag } = n2;
		switch (type) {
			case Text:
				processText(n1, n2, container, anchor);
				break;
			case Comment:
				// todo 注释节点
				break;
			default:
				if (shapeFlag & ShapeFlags.ELEMENT) {
					processElement(n1, n2, container, anchor, parentComponent, isSVG);
				} else if (shapeFlag & ShapeFlags.COMPONENT) {
					processComponent(n1, n2, container, anchor, parentComponent, isSVG);
				} else {
					console.warn(`为实现的type: ${String(type)}`);
				}
		}
	};

	const render: RootRenderFunction = (vnode, container, isSVG) => {
		if (vnode == null) {
			// 卸载
		} else {
			// 挂载 patch
			patch(container._vnode || null, vnode, container, null, null, isSVG);
		}
	};

	return {
		render,
		createApp: createAppAPI(render)
	};
}

function toggleRecurse(
	{ effect, update }: ComponentInternalInstance,
	allowed: boolean
) {
	effect.allowRecurse = update.allowRecurse = allowed;
}
