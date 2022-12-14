/* eslint-disable @typescript-eslint/no-empty-function */
import {
	isProxy,
	isReactive,
	markRaw,
	reactive,
	toRaw,
	effect,
	isRef,
	ref,
	computed
} from '../src';

describe('reactive', () => {
	it('test', () => {
		const original = { foo: 1 };
		const observed = reactive(original);

		expect(observed).not.toBe(original);
		expect(observed.foo).toBe(1);

		expect('foo' in observed).toBe(true);
		expect(Object.keys(observed)).toEqual(['foo']);
	});

	it('isReactive', () => {
		// 如果是 响应式对象 我们只需要触发一下get 然后进入我们判断 约定key 的逻辑, 最后返回一个 !readonly 就行
		const original = { age: 1 };
		const observed = reactive(original);

		expect(isReactive(original)).toBe(false);
		expect(isReactive(observed)).toBe(true);
	});

	it('nest reactive', () => {
		const original = {
			person: {
				age: 21,
				name: 'decade'
			},
			like: ['music']
		};
		const observed = reactive(original);
		expect(isReactive(observed.person)).toBe(true);
		expect(isReactive(original.like)).not.toBe(true);
	});

	it('isProxy', () => {
		const original = {
			person: {
				age: 21,
				name: 'decade'
			},
			like: ['music']
		};
		const observed = reactive(original);
		expect(isProxy(observed)).toBe(true);
		expect(isProxy(observed.like)).toBe(true);
	});

	it('observing subtypes of IterableCollections(Map, Set)', () => {
		// subtypes of Map
		class CustomMap extends Map {}
		const cmap = reactive(new CustomMap());

		expect(cmap instanceof Map).toBe(true);
		expect(isReactive(cmap)).toBe(true);

		cmap.set('key', {});
		expect(isReactive(cmap.get('key'))).toBe(true);

		// subtypes of Set
		class CustomSet extends Set {}
		const cset = reactive(new CustomSet());

		expect(cset instanceof Set).toBe(true);
		expect(isReactive(cset)).toBe(true);

		let dummy;
		effect(() => (dummy = cset.has('value')));
		expect(dummy).toBe(false);
		cset.add('value');
		expect(dummy).toBe(true);
		cset.delete('value');
		expect(dummy).toBe(false);
	});

	it('observing subtypes of WeakCollections(WeakMap, WeakSet)', () => {
		// subtypes of WeakMap
		class CustomMap extends WeakMap {}
		const cmap = reactive(new CustomMap());

		expect(cmap instanceof WeakMap).toBe(true);
		expect(isReactive(cmap)).toBe(true);

		const key = {};
		cmap.set(key, {});
		expect(isReactive(cmap.get(key))).toBe(true);

		// subtypes of WeakSet
		class CustomSet extends WeakSet {}
		const cset = reactive(new CustomSet());

		expect(cset instanceof WeakSet).toBe(true);
		expect(isReactive(cset)).toBe(true);

		let dummy;
		effect(() => (dummy = cset.has(key)));
		expect(dummy).toBe(false);
		cset.add(key);
		expect(dummy).toBe(true);
		cset.delete(key);
		expect(dummy).toBe(false);
	});

	it('original value change should reflect in observed value (Object)', () => {
		const original: any = { foo: 1 };
		const observed = reactive(original);
		// set
		original.bar = 1;
		expect(original.bar).toBe(1);
		expect(observed.bar).toBe(1);
		// delete
		delete original.foo;
		expect('foo' in original).toBe(false);
		expect('foo' in observed).toBe(false);
	});

	it('setting a property with an unobserved value should wrap with reactive', () => {
		const observed = reactive<{ foo?: object }>({});
		const raw = {};
		observed.foo = raw;
		expect(observed.foo).not.toBe(raw);
		expect(isReactive(observed.foo)).toBe(true);
	});

	it('observing already observed value should return same Proxy', () => {
		const original = { foo: 1 };
		const observed = reactive(original);
		const observed2 = reactive(observed);
		expect(observed2).toBe(observed);
	});

	it('observing the same value multiple times should return same Proxy', () => {
		const original = { foo: 1 };
		const observed = reactive(original);
		const observed2 = reactive(original);
		expect(observed2).toBe(observed);
	});

	test('should not pollute original object with Proxies', () => {
		const original: any = { foo: 1 };
		const original2 = { bar: 2 };
		const observed = reactive(original);
		const observed2 = reactive(original2);
		observed.bar = observed2;
		expect(observed.bar).toBe(observed2);
		expect(original.bar).toBe(original2);
	});

	test('toRaw', () => {
		const original = { foo: 1 };
		const observed = reactive(original);
		expect(toRaw(observed)).toBe(original);
		expect(toRaw(original)).toBe(original);
	});

	test('toRaw on object using reactive as prototype', () => {
		const original = reactive({});
		const obj = Object.create(original);
		const raw = toRaw(obj);
		expect(raw).toBe(obj);
		expect(raw).not.toBe(toRaw(original));
	});

	test('should not unwrap Ref<T>', () => {
		const observedNumberRef = reactive(ref(1));
		const observedObjectRef = reactive(ref({ foo: 1 }));

		expect(isRef(observedNumberRef)).toBe(true);
		expect(isRef(observedObjectRef)).toBe(true);
	});

	test('should unwrap computed refs', () => {
		// readonly
		const a = computed(() => 1);
		// writable
		const b = computed({
			get: () => 1,
			set: () => {}
		});
		const obj = reactive({ a, b });
		// check type
		obj.a + 1;
		obj.b + 1;
		expect(typeof obj.a).toBe(`number`);
		expect(typeof obj.b).toBe(`number`);
	});

	test('should allow setting property from a ref to another ref', () => {
		const foo = ref(0);
		const bar = ref(1);
		const observed = reactive({ a: foo });
		const dummy = computed(() => observed.a);
		expect(dummy.value).toBe(0);

		// @ts-ignore
		observed.a = bar;
		expect(dummy.value).toBe(1);

		bar.value++;
		expect(dummy.value).toBe(2);
	});

	test('non-observable values', () => {
		const assertValue = (value: any) => {
			reactive(value);
			expect(
				`value cannot be made reactive: ${String(value)}`
				// @ts-ignore
			).toHaveBeenWarnedLast();
		};

		// number
		assertValue(1);
		// string
		assertValue('foo');
		// boolean
		assertValue(false);
		// null
		assertValue(null);
		// undefined
		assertValue(undefined);
		// symbol
		const s = Symbol();
		assertValue(s);

		// built-ins should work and return same value
		const p = Promise.resolve();
		expect(reactive(p)).toBe(p);
		const r = new RegExp('');
		expect(reactive(r)).toBe(r);
		const d = new Date();
		expect(reactive(d)).toBe(d);
	});

	test('markRaw', () => {
		const obj = reactive({
			foo: { a: 1 },
			bar: markRaw({ b: 2 })
		});
		expect(isReactive(obj.foo)).toBe(true);
		expect(isReactive(obj.bar)).toBe(false);
	});

	test('should not observe non-extensible objects', () => {
		const obj = reactive({
			foo: Object.preventExtensions({ a: 1 }),
			// sealed or frozen objects are considered non-extensible as well
			bar: Object.freeze({ a: 1 }),
			baz: Object.seal({ a: 1 })
		});
		expect(isReactive(obj.foo)).toBe(false);
		expect(isReactive(obj.bar)).toBe(false);
		expect(isReactive(obj.baz)).toBe(false);
	});

	test('should not observe objects with __v_skip', () => {
		const original = {
			foo: 1,
			__v_skip: true
		};
		const observed = reactive(original);
		expect(isReactive(observed)).toBe(false);
	});

	describe('reactiveMap', () => {
		test('reactive Map has', () => {
			const target = reactive(new Map());
			let flagHas: boolean | undefined = undefined;
			effect(() => {
				flagHas = target.has('test');
			});

			expect(flagHas).toBe(false);

			target.set('test', 'test');
			expect(flagHas).toBe(true);
		});

		test('reactive Map get', () => {
			const target = reactive(new Map());
			let flagGet: string | undefined = undefined;
			effect(() => {
				flagGet = target.get('test');
			});

			expect(flagGet).toBe(undefined);

			target.set('test', 'test');
			expect(flagGet).toBe('test');
		});

		/**
		 * 通过size 我们通过自定义的key 来获取
		 * 这里我们定义为 ITERATE_KEY
		 */

		test('reactive Map size', () => {
			const target = reactive(new Map());
			let flagSize: number | undefined = undefined;
			effect(() => {
				flagSize = target.size;
			});

			expect(flagSize).toBe(0);

			target.set('test', 'test');
			expect(flagSize).toBe(1);
		});

		test('reactive set size', () => {
			const target = reactive<Set<string>>(new Set());
			let flagSize: number | undefined = undefined;
			let flagHas: boolean | undefined = undefined;
			effect(() => {
				flagSize = target.size;
			});
			effect(() => {
				flagHas = target.has('test');
			});

			expect(flagHas).toBe(false);
			expect(flagSize).toBe(0);

			target.add('test');
			expect(flagSize).toBe(1);
			expect(flagHas).toBe(true);
		});

		/**
		 * 数组通过length 收集依赖
		 * 我们还需要对 造成数组发生变化的方法 代理一遍
		 */
		test('reactive array length', () => {
			const target = reactive<number[]>([]);
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
});
