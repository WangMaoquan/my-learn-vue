import { shallowReactive, toRaw } from '@vue/reactivity';
import {
	capitalize,
	def,
	hasOwn,
	hyphenate,
	isArray,
	isObject,
	makeMap,
	toRawType
} from '@vue/shared';
import { ComponentInternalInstance, Data } from './component';
import { InternalObjectKey } from './vnode';

// 暂时就是实现 ["xxx", "xxx"] 这样的
export type ComponentPropsOptions = string[];

export type ExtractPropTypes<O> = {
	[K in keyof O]: O[K];
};

export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;

type DefaultFactory<T> = (props: Data) => T | null | undefined;

/**
 * vue2.x 中定义props 的对象类型
 */
export interface PropOptions<T = any, D = T> {
	type?: PropType<T> | true | null; // props 的type
	required?: boolean; // 是否必须
	default?: D | DefaultFactory<D> | null | undefined | object; // 默认值
	validator?(value: unknown): boolean; // 校验值是否满足
}

/**
 * {
 * 	type: String
 * }
 * {
 * 	type: [String, Number]
 * }
 */
export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];

type PropConstructor<T = any> = { new (...args: any[]): T & {} } | { (): T };

type NormalizedProp = null | PropOptions;

export type NormalizedProps = Record<string, NormalizedProp>;
export type NormalizedPropsOptions = [NormalizedProps, string[]] | [];

// 初始化props
export function initProps(
	instance: ComponentInternalInstance,
	rawProps: Data | null
) {
	const props: Data = {};
	const attrs: Data = {};
	// 打上标记
	def(attrs, InternalObjectKey, 1);

	// 初始化 propsDefaults
	instance.propsDefaults = Object.create(null);

	// 保证所有的key 都在props里面
	// for (const key in instance.propsOptions[0]) {
	// 	if (!(key in props)) {
	// 		props[key] = undefined;
	// 	}
	// }
	for (const key in rawProps) {
		if (!['class', 'style'].includes(key) && !(key in props)) {
			props[key] = rawProps[key];
		}
	}

	if (__DEV__) {
		validateProps(rawProps || {}, props, instance);
	}

	// todo 这里值处理有状态的组件
	instance.props = shallowReactive(props);
	instance.attrs = attrs;
}

function validateProps(
	rawProps: Data,
	props: Data,
	instance: ComponentInternalInstance
) {
	// 拿到原始的props
	const resolvedValues = toRaw(props);
	const options = instance.propsOptions[0];
	for (const key in options) {
		let opt = options[key];
		if (opt == null) continue;
		validateProp(
			key,
			resolvedValues[key],
			opt,
			!hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key))
		);
	}
}

// 判断是否是简单类型
const isSimpleType = makeMap('String,Number,Boolean,Function,Symbol,BigInt');

type AssertionResult = {
	valid: boolean;
	expectedType: string;
};

// 获取 type 名称
/**
 * function App() {};
 * getType(App)  => App;
 * getTypeString => String
 */
function getType(ctor: Prop<any>): string {
	// class/function .toString 会返回一个 'function App() {}' | 'class App1 {}'
	// 然后match 捕获到的就是 ['function App', 'function', 'App', index: 0, input: 'function App() {}', groups: undefined]
	// ['class App1', 'class', 'App1', index: 0, input: 'class App1 {}', groups: undefined]
	const match = ctor && ctor.toString().match(/^\s*(function|class) (\w+)/);
	return match ? match[2] : ctor === null ? 'null' : '';
}

function assertType(value: unknown, type: PropConstructor): AssertionResult {
	let valid;
	const expectedType = getType(type);
	if (isSimpleType(expectedType)) {
		const t = typeof value;
		valid = t === expectedType.toLowerCase();
		if (!valid && t === 'object') {
			valid = value instanceof type;
		}
	} else if (expectedType === 'Object') {
		valid = isObject(value);
	} else if (expectedType === 'Array') {
		valid = isArray(value);
	} else if (expectedType === 'null') {
		valid = value === null;
	} else {
		valid = value instanceof type;
	}
	return {
		valid,
		expectedType
	};
}

/**
 * 1. 判断是否是必须
 * 2. 检验对应的类型对不对
 * 3. 是否满足自定义的 validator
 */
function validateProp(
	name: string, // 属性名
	value: unknown, // 值
	prop: PropOptions, //所有属性的对象
	isAbsent: boolean // 是否是必须得
) {
	const { type, required, validator } = prop;
	if (required && isAbsent) {
		console.warn('Missing required prop: "' + name + '"');
		return;
	}
	if (value == null && !prop.required) {
		return;
	}
	// 校验类型
	if (type != null && type !== true) {
		let isValid = false;
		const types = isArray(type) ? type : [type];
		const expectedTypes = [];
		for (let i = 0; i < types.length && !isValid; i++) {
			const { valid, expectedType } = assertType(value, types[i]);
			expectedTypes.push(expectedType || '');
			isValid = valid;
		}
		if (!isValid) {
			console.warn(getInvalidTypeMessage(name, value, expectedTypes));
			return;
		}
	}
	// 调用自定义的validator
	if (validator && !validator(value)) {
		console.warn(
			'Invalid prop: custom validator check failed for prop "' + name + '".'
		);
	}
}

function getInvalidTypeMessage(
	name: string,
	value: unknown,
	expectedTypes: string[]
): string {
	let message =
		`Invalid prop: type check failed for prop "${name}".` +
		` Expected ${expectedTypes.map(capitalize).join(' | ')}`;
	const expectedType = expectedTypes[0];
	const receivedType = toRawType(value);
	const expectedValue = styleValue(value, expectedType);
	const receivedValue = styleValue(value, receivedType);
	if (
		expectedTypes.length === 1 &&
		isExplicable(expectedType) &&
		!isBoolean(expectedType, receivedType)
	) {
		message += ` with value ${expectedValue}`;
	}
	message += `, got ${receivedType} `;
	if (isExplicable(receivedType)) {
		message += `with value ${receivedValue}.`;
	}
	return message;
}

function styleValue(value: unknown, type: string): string {
	if (type === 'String') {
		return `"${value}"`;
	} else if (type === 'Number') {
		return `${Number(value)}`;
	} else {
		return `${value}`;
	}
}

function isExplicable(type: string): boolean {
	const explicitTypes = ['string', 'number', 'boolean'];
	return explicitTypes.some((elem) => type.toLowerCase() === elem);
}

function isBoolean(...args: string[]): boolean {
	return args.some((elem) => elem.toLowerCase() === 'boolean');
}

export function updateProps(
	instance: ComponentInternalInstance,
	rawProps: Data | null
) {
	// 处理props
	for (const key in rawProps) {
		instance.props[key] = rawProps[key];
	}
}
