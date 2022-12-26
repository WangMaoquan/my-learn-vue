export const enum ShapeFlags {
	ELEMENT = 1, // 普通element
	FUNCTIONAL_COMPONENT = 1 << 1, // function component
	STATEFUL_COMPONENT = 1 << 2, // 有状态的 component
	TEXT_CHILDREN = 1 << 3, // 文本children
	ARRAY_CHILDREN = 1 << 4, // 多个child
	SLOTS_CHILDREN = 1 << 5, // 插槽
	TELEPORT = 1 << 6, // teleport
	SUSPENSE = 1 << 7, // suspense
	COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // 需要 keepalive 的
	COMPONENT_KEPT_ALIVE = 1 << 9, // 已经被 keepalive
	COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 组件
}
