import {
	isProxy,
	isReactive,
	isShallow,
	reactive,
	shallowReadonly
} from './../src/reactive';
import { shallowReactive } from '../src/reactive';
import { isRef, Ref, ref } from '../src/ref';
import { effect } from '../src/effect';

describe('shallowReactive', () => {
	it('should not make non-reactive properties reactive', () => {
		const props = shallowReactive({ n: { foo: 1 } });
		expect(isReactive(props.n)).not.toBe(true);
	});

	it('should keep reactive properties reactive', () => {
		const props = shallowReactive({ n: reactive({ foo: 1 }) });
		// props.n = reactive({ foo: 2 })
		// props.n = {
		//   foo: 1
		// }
		expect(isReactive(props.n)).toBe(true);
	});

	it('should allow shallow and normal reactive for same target', () => {
		const original = { foo: {} };
		const shallowProxy = shallowReactive(original);
		const reactiveProxy = reactive(original);
		expect(shallowProxy).not.toBe(reactiveProxy);
		expect(isReactive(shallowProxy.foo)).toBe(false);
		expect(isReactive(reactiveProxy.foo)).toBe(true);
	});

	it('isShallow', () => {
		const origianl = {};
		const shallowReactiveObserved = shallowReactive(origianl);
		const shallowReadonlyObserved = shallowReadonly(origianl);
		expect(isShallow(shallowReactiveObserved)).toBe(true);
		expect(isShallow(shallowReadonlyObserved)).toBe(true);
	});

	it('isProxy', () => {
		const original = {
			person: {
				age: 21,
				name: 'decade'
			},
			like: ['music']
		};
		const observed = shallowReactive(original);
		expect(isProxy(observed)).toBe(true);
		expect(isProxy(observed.like)).toBe(false);
	});

	test('should not make non-reactive properties reactive', () => {
		const props = shallowReactive({ n: { foo: 1 } });
		expect(isReactive(props.n)).toBe(false);
	});

	test('should keep reactive properties reactive', () => {
		const props: any = shallowReactive({ n: reactive({ foo: 1 }) });
		props.n = reactive({ foo: 2 });
		expect(isReactive(props.n)).toBe(true);
	});

	test('should allow shallow and normal reactive for same target', () => {
		const original = { foo: {} };
		const shallowProxy = shallowReactive(original);
		const reactiveProxy = reactive(original);
		expect(shallowProxy).not.toBe(reactiveProxy);
		expect(isReactive(shallowProxy.foo)).toBe(false);
		expect(isReactive(reactiveProxy.foo)).toBe(true);
	});

	test('should respect shallow reactive nested inside reactive on reset', () => {
		const r = reactive({ foo: shallowReactive({ bar: {} }) });
		expect(isShallow(r.foo)).toBe(true);
		expect(isReactive(r.foo.bar)).toBe(false);

		r.foo = shallowReactive({ bar: {} });
		expect(isShallow(r.foo)).toBe(true);
		expect(isReactive(r.foo.bar)).toBe(false);
	});

	test('should not unwrap refs', () => {
		const foo = shallowReactive({
			bar: ref(123)
		});
		expect(isRef(foo.bar)).toBe(true);
		expect(foo.bar.value).toBe(123);
	});

	test('should not mutate refs', () => {
		const original = ref(123);
		const foo = shallowReactive<{ bar: Ref<number> | number }>({
			bar: original
		});
		expect(foo.bar).toBe(original);
		foo.bar = 234;
		expect(foo.bar).toBe(234);
		expect(original.value).toBe(123);
	});

	test('should respect shallow/deep versions of same target on access', () => {
		const original = {};
		const shallow = shallowReactive(original);
		const deep = reactive(original);
		const r = reactive({ shallow, deep });
		expect(r.shallow).toBe(shallow);
		expect(r.deep).toBe(deep);
	});

	test('shallowReactive array length', () => {
		const target = shallowReactive<number[]>([]);
		let flagLength: number | undefined = undefined;
		effect(() => {
			flagLength = target.length;
		});
		expect(flagLength).toBe(0);
		target.push(1);
		expect(flagLength).toBe(1);
		target.pop();
		expect(flagLength).toBe(0);
		target.unshift(...[1, 2]);
		expect(flagLength).toBe(2);
		target.shift();
		expect(flagLength).toBe(1);
		target.splice(0, 1);
		expect(flagLength).toBe(0);
	});
});
