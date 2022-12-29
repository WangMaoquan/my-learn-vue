import { toRaw } from '@vue/reactivity';
import { EMPTY_OBJ, hasOwn, isString, NOOP } from '@vue/shared';
import { ComponentInternalInstance, Data } from './component';
import { EmitsOptions } from './componentEmits';
import { shouldCacheAccess } from './componentOptions';
import { currentRenderingInstance } from './componentRenderContext';

export type ComponentPublicInstance<
	P = {}, // props
	B = {}, // setup
	E extends EmitsOptions = {} // emit 属性
> = {};

export type CreateComponentPublicInstance<
	P = {},
	B = {},
	E extends EmitsOptions = {}
> = ComponentPublicInstance<P, B, E>;

export type ComponentPublicInstanceConstructor<
	T extends ComponentPublicInstance<
		Props,
		RawBindings
	> = ComponentPublicInstance<any>,
	Props = any,
	RawBindings = any
> = {
	__isFragment?: never;
	__isTeleport?: never;
	__isSuspense?: never;
	new (...args: any[]): T;
};

const enum AccessTypes {
	OTHER,
	SETUP,
	DATA,
	PROPS,
	CONTEXT
}

export interface ComponentRenderContext {
	[key: string]: any;
	_: ComponentInternalInstance;
}

// _ $ 开头的属性名
export const isReservedPrefix = (key: string) => key === '_' || key === '$';

// 判断是不是 setup的返回值
const hasSetupBinding = (state: Data, key: string) =>
	state !== EMPTY_OBJ && hasOwn(state, key);

/**
 * 这个里面主要 处理的 render中使用到的相同的属性名 是来自哪里的
 * 比如
 * defineComponent({
 * 	setup() {
 * 		const state = reactive({
 * 			age: 1,
 * 		})
 * 	},
 *	data(){
 *    state: {
 * 			age: 2
 * 		}
 *  }
 * })
 * 我们在页面显示中的应该是哪个呢 答案就在下面那个方法
 * 通过get 我们看出来 顺序是 setup / data /props/ ctx /globalProperties
 */
export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
	get({ _: instance }: ComponentRenderContext, key: string) {
		const { ctx, setupState, data, props, accessCache, appContext } = instance;
		if (__DEV__ && key === '__isVue') {
			return true;
		}
		/**
		 * accessCache 的key 是我们读取的key 比如上面的 age, value 对应的是这个key 是在 setup/data/props/ctx 哪个中
		 */
		let normalizedProps;
		if (key[0] !== '$') {
			// 首先不是 $data 啥玩意的
			const n = accessCache![key]; // 获取对应在哪个中
			if (n !== undefined) {
				switch (n) {
					case AccessTypes.SETUP: // setup
						return setupState[key];
					case AccessTypes.DATA: // data
						return data[key];
					case AccessTypes.CONTEXT: // ctx
						return ctx[key];
					case AccessTypes.PROPS: // props
						return props![key];
				}
			} else if (hasSetupBinding(setupState, key)) {
				// 首先判断的是 是否是  setup 返回值里面
				accessCache![key] = AccessTypes.SETUP; // 打上标记
				return setupState[key]; // 返回
			} else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
				// 在判断是不是 data 里面
				accessCache![key] = AccessTypes.DATA;
				return data[key];
			} else if (
				(normalizedProps = instance.propsOptions[0]) &&
				hasOwn(normalizedProps, key)
			) {
				// 然后判断是否是props里面
				accessCache![key] = AccessTypes.PROPS;
				return props![key];
			} else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
				// 然后判断是否是 globalProperties
				accessCache![key] = AccessTypes.CONTEXT;
				return ctx[key];
			} else if (!__FEATURE_OPTIONS_API__ || shouldCacheAccess) {
				accessCache![key] = AccessTypes.OTHER;
			}
		}

		let globalProperties;
		// todo $data... 的访问
		if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
			accessCache![key] = AccessTypes.CONTEXT;
			return ctx[key];
		} else if (
			((globalProperties = appContext.config.globalProperties),
			hasOwn(globalProperties, key))
		) {
			return globalProperties[key];
		} else if (
			__DEV__ &&
			currentRenderingInstance &&
			(!isString(key) || key.indexOf('__v') !== 0)
		) {
			if (data !== EMPTY_OBJ && isReservedPrefix(key[0]) && hasOwn(data, key)) {
				console.warn(
					`Property ${JSON.stringify(
						key
					)} must be accessed via $data because it starts with a reserved ` +
						`character ("$" or "_") and is not proxied on the render context.`
				);
			} else if (instance === currentRenderingInstance) {
				console.warn(
					`Property ${JSON.stringify(key)} was accessed during render ` +
						`but is not defined on instance.`
				);
			}
		}
	},

	set(
		{ _: instance }: ComponentRenderContext,
		key: string,
		value: any
	): boolean {
		const { data, setupState, ctx } = instance;
		if (hasSetupBinding(setupState, key)) {
			setupState[key] = value;
			return true;
		} else if (
			__DEV__ &&
			setupState.__isScriptSetup &&
			hasOwn(setupState, key)
		) {
			console.warn(
				`Cannot mutate <script setup> binding "${key}" from Options API.`
			);
			return false;
		} else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
			data[key] = value;
			return true;
		} else if (hasOwn(instance.props, key)) {
			__DEV__ &&
				console.warn(`Attempting to mutate prop "${key}". Props are readonly.`);
			return false;
		}
		if (key[0] === '$' && key.slice(1) in instance) {
			__DEV__ &&
				console.warn(
					`Attempting to mutate public property "${key}". ` +
						`Properties starting with $ are reserved and readonly.`
				);
			return false;
		} else {
			if (__DEV__ && key in instance.appContext.config.globalProperties) {
				Object.defineProperty(ctx, key, {
					enumerable: true,
					configurable: true,
					value
				});
			} else {
				ctx[key] = value;
			}
		}
		return true;
	},

	has(
		{
			_: { data, setupState, accessCache, ctx, appContext, propsOptions }
		}: ComponentRenderContext,
		key: string
	) {
		let normalizedProps;
		return (
			!!accessCache![key] ||
			(data !== EMPTY_OBJ && hasOwn(data, key)) ||
			hasSetupBinding(setupState, key) ||
			((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
			hasOwn(ctx, key) ||
			hasOwn(appContext.config.globalProperties, key)
		);
	},

	defineProperty(
		target: ComponentRenderContext,
		key: string,
		descriptor: PropertyDescriptor
	) {
		if (descriptor.get != null) {
			// invalidate key cache of a getter based property #5417
			target._.accessCache![key] = 0;
		} else if (hasOwn(descriptor, 'value')) {
			this.set!(target, key, descriptor.value, null);
		}
		return Reflect.defineProperty(target, key, descriptor);
	}
};

export function exposePropsOnRenderContext(
	instance: ComponentInternalInstance
) {
	const {
		ctx,
		propsOptions: [propsOptions]
	} = instance;
	if (propsOptions) {
		Object.keys(propsOptions).forEach((key) => {
			Object.defineProperty(ctx, key, {
				enumerable: true,
				configurable: true,
				get: () => instance.props[key],
				set: NOOP
			});
		});
	}
}

export function exposeSetupStateOnRenderContext(
	instance: ComponentInternalInstance
) {
	const { ctx, setupState } = instance;
	Object.keys(toRaw(setupState)).forEach((key) => {
		if (!setupState.__isScriptSetup) {
			if (isReservedPrefix(key[0])) {
				console.warn(
					`setup() return property ${JSON.stringify(
						key
					)} should not start with "$" or "_" ` +
						`which are reserved prefixes for Vue internals.`
				);
				return;
			}
			Object.defineProperty(ctx, key, {
				enumerable: true,
				configurable: true,
				get: () => setupState[key],
				set: NOOP
			});
		}
	});
}
