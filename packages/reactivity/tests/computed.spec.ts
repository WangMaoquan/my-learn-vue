import {
	isReadonly,
	reactive,
	computed,
	WritableComputedRef,
	effect,
	ref
} from '../src';

describe('reactivity/computed', () => {
	it('should return updated value', () => {
		const value = reactive<{ foo?: number }>({});
		const cValue = computed(() => value.foo);
		expect(cValue.value).toBe(undefined);
		value.foo = 1;
		expect(cValue.value).toBe(1);
	});

	it('should compute lazily', () => {
		const value = reactive<{ foo?: number }>({});
		const getter = jest.fn(() => value.foo);
		const cValue = computed(getter);

		// lazy
		expect(getter).not.toHaveBeenCalled();

		expect(cValue.value).toBe(undefined);
		expect(getter).toHaveBeenCalledTimes(1);

		// should not compute again
		cValue.value;
		expect(getter).toHaveBeenCalledTimes(1);

		// should not compute until needed
		value.foo = 1;
		expect(getter).toHaveBeenCalledTimes(1);

		// now it should compute
		expect(cValue.value).toBe(1);
		expect(getter).toHaveBeenCalledTimes(2);

		// should not compute again
		cValue.value;
		expect(getter).toHaveBeenCalledTimes(2);
	});

	it('should trigger effect', () => {
		const value = reactive<{ foo?: number }>({});
		const cValue = computed(() => value.foo);
		let dummy;
		effect(() => {
			dummy = cValue.value;
		});
		expect(dummy).toBe(undefined);
		value.foo = 1;
		expect(dummy).toBe(1);
	});

	it('should work when chained', () => {
		const value = reactive({ foo: 0 });
		const c1 = computed(() => value.foo);
		const c2 = computed(() => c1.value + 1);
		expect(c2.value).toBe(1);
		expect(c1.value).toBe(0);
		value.foo++;
		expect(c2.value).toBe(2);
		expect(c1.value).toBe(1);
	});

	it('should trigger effect when chained', () => {
		const value = reactive({ foo: 0 });
		const getter1 = jest.fn(() => value.foo);
		const getter2 = jest.fn(() => {
			return c1.value + 1;
		});
		const c1 = computed(getter1);
		const c2 = computed(getter2);

		let dummy;
		effect(() => {
			dummy = c2.value;
		});
		expect(dummy).toBe(1);
		expect(getter1).toHaveBeenCalledTimes(1);
		expect(getter2).toHaveBeenCalledTimes(1);
		value.foo++;
		expect(dummy).toBe(2);
		// should not result in duplicate calls
		expect(getter1).toHaveBeenCalledTimes(2);
		expect(getter2).toHaveBeenCalledTimes(2);
	});

	it('should trigger effect when chained (mixed invocations)', () => {
		const value = reactive({ foo: 0 });
		const getter1 = jest.fn(() => value.foo);
		const getter2 = jest.fn(() => {
			return c1.value + 1;
		});
		const c1 = computed(getter1);
		const c2 = computed(getter2);

		let dummy;
		effect(() => {
			dummy = c1.value + c2.value;
		});
		expect(dummy).toBe(1);

		expect(getter1).toHaveBeenCalledTimes(1);
		expect(getter2).toHaveBeenCalledTimes(1);
		value.foo++;
		expect(dummy).toBe(3);
		// should not result in duplicate calls
		expect(getter1).toHaveBeenCalledTimes(2);
		expect(getter2).toHaveBeenCalledTimes(2);
	});

	it('should no longer update when stopped', () => {
		const value = reactive<{ foo?: number }>({});
		const cValue = computed(() => value.foo);
		let dummy;
		effect(() => {
			dummy = cValue.value;
		});
		expect(dummy).toBe(undefined);
		value.foo = 1;
		expect(dummy).toBe(1);
		cValue.effect.stop();
		value.foo = 2;
		expect(dummy).toBe(1);
	});

	it('should support setter', () => {
		const n = ref(1);
		const plusOne = computed({
			get: () => n.value + 1,
			set: (val) => {
				n.value = val - 1;
			}
		});

		expect(plusOne.value).toBe(2);
		n.value++;
		expect(plusOne.value).toBe(3);

		plusOne.value = 0;
		expect(n.value).toBe(-1);
	});

	it('should trigger effect w/ setter', () => {
		const n = ref(1);
		const plusOne = computed({
			get: () => n.value + 1,
			set: (val) => {
				n.value = val - 1;
			}
		});

		let dummy;
		effect(() => {
			dummy = n.value;
		});
		expect(dummy).toBe(1);

		plusOne.value = 0;
		expect(dummy).toBe(-1);
	});

	// #5720
	it('should invalidate before non-computed effects', () => {
		const plusOneValues: number[] = [];
		const n = ref(0);
		const plusOne = computed(() => n.value + 1);
		effect(() => {
			n.value;
			plusOneValues.push(plusOne.value);
		});
		// access plusOne, causing it to be non-dirty
		plusOne.value;
		// mutate n
		n.value++;
		// on the 2nd run, plusOne.value should have already updated.
		expect(plusOneValues).toMatchObject([1, 2, 2]);
	});

	it('should be readonly', () => {
		// 只传入了一个回调 就是 readonly
		// 只需要多加个 isReadonly 参数
		// isReadonly 方法验证的是 是否有 __v_isReadonly 这个key 所以还有在 computedImpl 类里面加一个key
		let a = { a: 1 };
		const x = computed(() => a);
		expect(isReadonly(x)).toBe(true);
		expect(isReadonly(x.value)).toBe(false);
		expect(isReadonly(x.value.a)).toBe(false);
		const z = computed<typeof a>({
			get() {
				return a;
			},
			set(v) {
				a = v;
			}
		});
		expect(isReadonly(z)).toBe(false);
		expect(isReadonly(z.value.a)).toBe(false);
	});

	it('should expose value when stopped', () => {
		const x = computed(() => 1);
		x.effect.stop();
		expect(x.value).toBe(1);
	});

	it('should warn if trying to set a readonly computed', () => {
		const n = ref(1);
		const plusOne = computed(() => n.value + 1);
		(plusOne as WritableComputedRef<number>).value++; // Type cast to prevent TS from preventing the error

		expect(
			'Write operation failed: computed value is readonly'
			// @ts-ignore
		).toHaveBeenWarnedLast();
	});
});
