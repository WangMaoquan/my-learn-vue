export const enum PatchFlags {
	TEXT = 1, // 只有文本的
	CLASS = 1 << 1, // class 是动态的
	STYLE = 1 << 2, // style 也是动态的
	PROPS = 1 << 3, // props 也是动态
	FULL_PROPS = 1 << 4, // 前面三个都是动态的
	HYDRATE_EVENTS = 1 << 5, // 加了自定义事件的
	STABLE_FRAGMENT = 1 << 6, // fragment 下面的children 是稳定的 不会发生改变的
	KEYED_FRAGMENT = 1 << 7, // fragment 下面的children 有key
	UNKEYED_FRAGMENT = 1 << 8, // fragment 下面的children 没有key
	NEED_PATCH = 1 << 9, // 是需要被patch
	DYNAMIC_SLOTS = 1 << 10, // vfor 动态插槽
	DEV_ROOT_FRAGMENT = 1 << 11,
	HOISTED = -1,
	BAIL = -2
}

export const PatchFlagNames = {
	[PatchFlags.TEXT]: `TEXT`,
	[PatchFlags.CLASS]: `CLASS`,
	[PatchFlags.STYLE]: `STYLE`,
	[PatchFlags.PROPS]: `PROPS`,
	[PatchFlags.FULL_PROPS]: `FULL_PROPS`,
	[PatchFlags.HYDRATE_EVENTS]: `HYDRATE_EVENTS`,
	[PatchFlags.STABLE_FRAGMENT]: `STABLE_FRAGMENT`,
	[PatchFlags.KEYED_FRAGMENT]: `KEYED_FRAGMENT`,
	[PatchFlags.UNKEYED_FRAGMENT]: `UNKEYED_FRAGMENT`,
	[PatchFlags.NEED_PATCH]: `NEED_PATCH`,
	[PatchFlags.DYNAMIC_SLOTS]: `DYNAMIC_SLOTS`,
	[PatchFlags.DEV_ROOT_FRAGMENT]: `DEV_ROOT_FRAGMENT`,
	[PatchFlags.HOISTED]: `HOISTED`,
	[PatchFlags.BAIL]: `BAIL`
};
