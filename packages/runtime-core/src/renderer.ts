import { ReactiveEffect } from '@vue/reactivity';
import {
	EMPTY_OBJ,
	invokeArrayFns,
	isFunction,
	ShapeFlags,
	isArray,
	EMPTY_ARR
} from '@vue/shared';
import { createAppAPI, CreateAppFunction } from './apiCreateApp';
import {
	ComponentInternalInstance,
	createComponentInstance,
	setupComponent
} from './component';
import { updateProps } from './componentProps';
import { renderComponentRoot } from './componentRenderUtils';
import { SchedulerJob } from './scheduler';
import {
	isSameVNodeType,
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

type NextFn = (vnode: VNode) => RendererNode | null;

type ProcessTextOrCommentFn = (
	n1: VNode | null,
	n2: VNode,
	container: RendererElement,
	anchor: RendererNode | null
) => void;

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
		remove: hostRemove,
		createComment: hostCreateComment,
		parentNode: hostParentNode,
		nextSibling: hostNextSibling
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
		const { el } = vnode;
		hostRemove(el!);
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

		if (isArray(children)) {
			unmountChildren(children as VNode[], parentComponent);
		}

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

		/**
		 * 我们要明白 只会存在 text_children / array_children
		 * 1. 旧的是text, 新的是array 类型不一样 卸载旧的 挂载新的
		 * 2. 旧的是text, 新的也是text 直接替换
		 * 3. 旧的是array, 新的是text 卸载旧的 挂载新的
		 * 4. 旧的是array, 新的也是array diff
		 */

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
		} else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
			// 都是数组
			if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				// todo
				patchKeyedChildren(
					c1 as VNode[],
					c2 as VNodeArrayChildren,
					container,
					anchor,
					parentComponent,
					isSVG
				);
			} else {
				// 直接卸载旧的
				unmountChildren(c1 as VNode[], parentComponent);
			}
		} else {
			// 旧的是 文本, 新的是array
			if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
				hostSetElementText(container, '');
			}
			// 直接挂载新的
			if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
				mountChildren(
					c2 as VNodeArrayChildren,
					container,
					anchor,
					parentComponent,
					isSVG
				);
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
				let { next, vnode } = instance;
				console.log('update');
				toggleRecurse(instance, false);
				if (next) {
					next.el = vnode.el;
					updateComponentPreRender(instance, next);
				} else {
					next = vnode;
				}
				/**
				 * beforeupdate 钩子
				 * vnode 的beforeupdate 钩子
				 */
				toggleRecurse(instance, true);
				const nextTree = renderComponentRoot(instance);
				const prevTree = instance.subTree;
				instance.subTree = nextTree;
				patch(
					prevTree,
					nextTree,
					hostParentNode(prevTree.el!)!,
					getNextHostNode(prevTree),
					instance,
					isSVG
				);
			}
		};

		// 创建 组件的render effect 并将update 作为scheduler 传入
		const effect = (instance.effect = new ReactiveEffect(
			componentUpdateFn,
			() => update() // todo 需要用调度来, 但是我还没实现
		));

		// 组件更新调用的方法
		const update: SchedulerJob = (instance.update = () => effect.run());
		// 组件的创建顺序一定是 先父后子, 所以执行副作用的时候 也一定是id小的在前面, 所以 update.id 直接用 instance的uid
		update.id = instance.uid;

		// 然后我们需要手动执行下
		update();
	};

	// 在update 流程 调用render 之前 重新处理 props, slots, 保证更新的时候是最新的
	const updateComponentPreRender = (
		instance: ComponentInternalInstance,
		nextVNode: VNode
	) => {
		// 重新赋值instance
		nextVNode.component = instance;
		// 为了下次更新 将这次的next 做为下次的vnode
		instance.vnode = nextVNode;
		// 重置 next
		instance.next = null;
		// 更新props
		updateProps(instance, nextVNode.props);

		// todo update slots
	};

	// 实现updateComponent
	const updateComponent = (n1: VNode, n2: VNode) => {
		// 获取当前的组件是实例 同事将n1 的赋值给n2
		const instance = (n2.component = n1.component)!;

		instance.next = n2;

		// 执行update
		instance.update();
	};

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
			updateComponent(n1, n2);
		}
	};

	const processCommentNode: ProcessTextOrCommentFn = (
		n1,
		n2,
		container,
		anchor
	) => {
		// 挂载
		if (n1 == null) {
			// 插入
			hostInsert(
				(n2.el = hostCreateComment((n2.children as string) || '')),
				container,
				anchor
			);
		} else {
			// 更新, 注释节点 直接替换注释就行, 所以直接把 旧的el 复制 给新的el
			n2.el = n1.el;
		}
	};

	const patchKeyedChildren = (
		c1: VNode[],
		c2: VNodeArrayChildren,
		container: RendererElement,
		parentAnchor: RendererNode | null,
		parentComponent: ComponentInternalInstance | null,
		isSVG: boolean
	) => {
		let i = 0;
		const l2 = c2.length; // 新的长度
		let e1 = c1.length - 1; // 旧的endindex
		let e2 = l2 - 1; // 新的endindex

		// (a b) c
		// (a b) d e
		while (i <= e1 && i <= e2) {
			const n1 = c1[i];
			const n2 = (c2[i] = normalizeVNode(c2[i]));
			if (isSameVNodeType(n1, n2)) {
				patch(n1, n2, container, null, parentComponent, isSVG);
			} else {
				break;
			}
			i++;
		}

		// a (b c)
		// e d (b c)
		while (i <= e1 && i <= e2) {
			const n1 = c1[e1];
			const n2 = (c2[e2] = normalizeVNode(c2[e2]));
			if (isSameVNodeType(n1, n2)) {
				patch(n1, n2, container, null, parentComponent, isSVG);
			} else {
				break;
			}
			e1--;
			e2--;
		}

		// 头遍历 i 小于 e2 说明中间还有未挂载的
		if (i > e1) {
			// 尾巴遍历 新的前面还有为挂载的
			if (i <= e2) {
				// nextPos 是插入位置的下一个元素所在的位置
				/**
				 * 为啥不使用 nextpos = i + 1;
				 *     a b
				 * c d a b
				 * 这种例子时会出现问题
				 * 相较于 i e2 的位置 + 1 一定是存在的可插入的位置的
				 */
				const nextPos = e2 + 1;
				const anchor = nextPos < l2 ? (c2[nextPos] as VNode).el : parentAnchor;
				while (i <= e2) {
					patch(
						null,
						(c2[i] = normalizeVNode(c2[i])),
						container,
						anchor,
						parentComponent,
						isSVG
					);
					i++;
				}
			}
		} else if (i > e2) {
			// 说明旧的比新的多
			while (i <= e1) {
				// 卸载
				unmount(c1[i], parentComponent, true);
				i++;
			}
		} else {
			/**
			 * 处理中间部分
			 * 1. 寻找能复用的
			 * 2. 删除旧的不存在的
			 * 3. 增加新的未插入的
			 * 4. 新插入的还需要插入到指定位置
			 */
			const s1 = i; // 用于遍历旧的其实index
			const s2 = i; // 用于遍历新的起始index

			// newChildren 每一项的key 对应的 index map
			const keyToNewIndexMap: Map<string | number | symbol, number> = new Map();

			// 生成 keyToNewIndexMap
			for (i = s2; i <= e2; i++) {
				const nextChild = normalizeVNode(c2[i]);
				if (nextChild.key != null) {
					if (keyToNewIndexMap.has(nextChild.key)) {
						console.warn(
							`Duplicate keys found during update:`,
							JSON.stringify(nextChild.key),
							`Make sure keys are unique.`
						);
					}
					keyToNewIndexMap.set(nextChild.key, i);
				}
			}

			let patched = 0; // 新中patch 的数量用于 优化处理 当新的patch完了, 旧的其实就不用遍历了, 直接unmount
			const toBePatched = e2 - s2 + 1; // 新中需要被patch的数量
			const newIndexToOldIndexMap = new Array(toBePatched); // 新中index 对应的 旧中的index
			let moved = false; // vnode是否需要移动
			let maxNewIndexSoFar = 0; // 记录最大下标
			for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0; // 初始化为0
			// 卸载旧的中没能被复用的 vnode
			for (i = s1; i <= e1; i++) {
				const prevChild = c1[i];
				let newIndex: number | undefined;

				// 新的其实已经patch 完了, 只需要卸载剩下的旧的
				if (patched >= toBePatched) {
					unmount(prevChild, parentComponent, true);
					continue;
				}

				// 判断是否能复用
				if (prevChild.key != null) {
					newIndex = keyToNewIndexMap.get(prevChild.key);
				} else {
					// 没有复用的 需要在新的中再遍历一次 也就是没有key 的情况
					for (let j = s2; j < e2; j++) {
						if (isSameVNodeType(prevChild, c2[j] as VNode)) {
							newIndex = j;
							// 找到了就break
							break;
						}
					}
				}
				// 不存在就卸载
				if (newIndex === undefined) {
					unmount(prevChild, parentComponent, true);
				} else {
					// 这里是复用逻辑, 说明可以 修改 newIndexToOldIndexMap
					// newIndexToOldIndexMap 是从 0 开始的, 所以需要 newIndex - s2
					newIndexToOldIndexMap[newIndex - s2] = i + 1; // 因为i 可能为0 所以 + 1
					if (newIndex >= maxNewIndexSoFar) {
						maxNewIndexSoFar = newIndex;
					} else {
						moved = true;
					}
					// 存在就去复用
					patch(
						prevChild,
						c2[newIndex] as VNode,
						container,
						null,
						parentComponent,
						isSVG
					);
					// patched + 1
					patched++;
				}
			}

			/**
			 * a b (c d e) f g
			 * a b (e c d) f g
			 * 这样的中间部分, 都是可以复用的, 唯一的区别就是排序不同
			 * 所以接下来我们要做的是 怎么去确定 是否需要move 以及 怎么move 的成本最小
			 *
			 * 我们看新 之后 ecd 对应 旧中的 下标为 4 2 3, 旧中的 2 3 4 => 2 3 是相对没有变的
			 *
			 * 从小到大的排序一定是稳定的, 不管你怎么插入 移动
			 *
			 * 所以我们尽量通过递增序列去 即 最长递增子序列
			 *
			 * [0, 1, 2] 这是新的
			 * [5, 3, 4] 这是生成的映射 因为 + 1
			 */

			/**
			 * 生成最长递增子序列
			 * 最长递增子序列是需要时间的 所以我们需要判断 是否需要moved
			 * 怎么判断是否需要moved
			 * 要移动 说明能复用 复用的话我们是不是需要 知道 对应在 newChildren 的下标
			 * 遍历旧的 keyToNewIndexMap[c1[i].key] 这里拿出来的就是 对应的下标 如果不需要移动的话 是不是一个递增的
			 * 比如 1 2 3 这种, 但是实际上 我们是 2 3 1 [c d e] 当取到 e 时 1 < 3 所以 e 是需要move的
			 */
			const increasingNewIndexSequence = moved
				? getSequence(newIndexToOldIndexMap)
				: EMPTY_ARR;
			let j = increasingNewIndexSequence.length - 1;
			/**
			 * 为啥这里需要倒着插, 倒着插入一定是最稳定 不会存在前一个也是一个可能位置不对的元素
			 * a b (c d e) f g
			 * a b (e c d) f g
			 * 比如 这里 插入c, d 是不是 还没有被插入即不稳定
			 * 但是我们倒着 f 一定是稳定的
			 */
			for (let i = toBePatched - 1; i >= 0; i--) {
				const nextIndex = s2 + i; // 这是实际的新children的下标
				const nextChild = c2[nextIndex] as VNode; // 获取 对应的vnode
				// 插入位置
				const anchor =
					nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor;

				// 挂载
				if (newIndexToOldIndexMap[i] === 0) {
					// 为0 说明是新的 直接mount
					patch(null, nextChild, container, anchor, parentComponent, isSVG);
				} else if (moved) {
					// 移动
					if (i !== increasingNewIndexSequence[j]) {
						move(nextChild, container, anchor);
					} else {
						j--;
					}
				}
			}
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
				processCommentNode(n1, n2, container, anchor);
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

	const getNextHostNode: NextFn = (vnode) => {
		if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
			return getNextHostNode(vnode.component!.subTree);
		}
		return hostNextSibling((vnode.anchor || vnode.el)!);
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

function getSequence(arr: number[]): number[] {
	const p = arr.slice();
	const result = [0];
	let i, j, u, v, c;
	const len = arr.length;
	for (i = 0; i < len; i++) {
		const arrI = arr[i];
		if (arrI !== 0) {
			j = result[result.length - 1];
			if (arr[j] < arrI) {
				p[i] = j;
				result.push(i);
				continue;
			}
			u = 0;
			v = result.length - 1;
			while (u < v) {
				c = (u + v) >> 1;
				if (arr[result[c]] < arrI) {
					u = c + 1;
				} else {
					v = c;
				}
			}
			if (arrI < arr[result[u]]) {
				if (u > 0) {
					p[i] = result[u - 1];
				}
				result[u] = i;
			}
		}
	}
	u = result.length;
	v = result[u - 1];
	while (u-- > 0) {
		result[u] = v;
		v = p[v];
	}
	return result;
}
