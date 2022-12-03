import { isProxy, isReactive, isReadonly, reactive } from './../src/reactive';
import { readonly } from '../src/reactive';
import { effect } from '../src/effect';

type Writable<T> = { -readonly [P in keyof T]: T[P] };
describe('readonly', () => {
  it('readonly test', () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);

    expect(wrapped.foo).toBe(1);

    // @ts-ignore
    wrapped.foo = 2;
    expect(wrapped.foo).toBe(1);
    expect(
      `Set operation on key "foo" failed: target is readonly.`,
      // @ts-ignore
    ).toHaveBeenWarnedLast();
  });

  it('nest readonly', () => {
    const original = {
      person: {
        age: 21,
        name: 'decade',
      },
      like: ['music'],
    };

    const wrapped = readonly(original);

    expect(isReadonly(wrapped.like)).toBe(true);
    expect(isReadonly(original.like)).not.toBe(true);
  });

  it('isProxy', () => {
    const original = {
      person: {
        age: 21,
        name: 'decade',
      },
      like: ['music'],
    };
    const observed = readonly(original);
    expect(isProxy(observed)).toBe(true);
    expect(isProxy(observed.like)).toBe(true);
  });

  it('should make nested values readonly', () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    expect(wrapped).not.toBe(original);
    expect(isProxy(wrapped)).toBe(true);
    expect(isReactive(wrapped)).toBe(false);
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(isReadonly(original)).toBe(false);
    expect(isReactive(wrapped.bar)).toBe(false);
    expect(isReadonly(wrapped.bar)).toBe(true);
    expect(isReactive(original.bar)).toBe(false);
    expect(isReadonly(original.bar)).toBe(false);
    // get
    expect(wrapped.foo).toBe(1);
    // has
    expect('foo' in wrapped).toBe(true);
    // ownKeys
    expect(Object.keys(wrapped)).toEqual(['foo', 'bar']);
  });

  it('should not allow mutation', () => {
    const qux = Symbol('qux');
    const original = {
      foo: 1,
      bar: {
        baz: 2,
      },
      [qux]: 3,
    };
    const wrapped: Writable<typeof original> = readonly(original);

    wrapped.foo = 2;
    expect(wrapped.foo).toBe(1);
    expect(
      `Set operation on key "foo" failed: target is readonly.`,
      // @ts-ignore
    ).toHaveBeenWarnedLast();

    wrapped.bar.baz = 3;
    expect(wrapped.bar.baz).toBe(2);
    expect(
      `Set operation on key "baz" failed: target is readonly.`,
      // @ts-ignore
    ).toHaveBeenWarnedLast();

    wrapped[qux] = 4;
    expect(wrapped[qux]).toBe(3);
    expect(
      `Set operation on key "Symbol(qux)" failed: target is readonly.`,
      // @ts-ignore
    ).toHaveBeenWarnedLast();

    // @ts-expect-error
    delete wrapped.foo;
    expect(wrapped.foo).toBe(1);
    expect(
      `Delete operation on key "foo" failed: target is readonly.`,
      // @ts-ignore
    ).toHaveBeenWarnedLast();

    // @ts-expect-error
    delete wrapped.bar.baz;
    expect(wrapped.bar.baz).toBe(2);
    expect(
      `Delete operation on key "baz" failed: target is readonly.`,
      // @ts-ignore
    ).toHaveBeenWarnedLast();

    // @ts-expect-error
    delete wrapped[qux];
    expect(wrapped[qux]).toBe(3);
    expect(
      `Delete operation on key "Symbol(qux)" failed: target is readonly.`,
      // @ts-ignoreÍ
    ).toHaveBeenWarnedLast();
  });

  it('should not trigger effects', () => {
    const wrapped: any = readonly({ a: 1 });
    let dummy;
    effect(() => {
      dummy = wrapped.a;
    });
    expect(dummy).toBe(1);
    wrapped.a = 2;
    expect(wrapped.a).toBe(1);
    expect(dummy).toBe(1);
    // @ts-ignore
    expect(`target is readonly`).toHaveBeenWarned();
  });

  describe('Array', () => {
    it('should make nested values readonly', () => {
      const original = [{ foo: 1 }];
      const wrapped = readonly(original);
      expect(wrapped).not.toBe(original);
      expect(isProxy(wrapped)).toBe(true);
      expect(isReactive(wrapped)).toBe(false);
      expect(isReadonly(wrapped)).toBe(true);
      expect(isReactive(original)).toBe(false);
      expect(isReadonly(original)).toBe(false);
      expect(isReactive(wrapped[0])).toBe(false);
      expect(isReadonly(wrapped[0])).toBe(true);
      expect(isReactive(original[0])).toBe(false);
      expect(isReadonly(original[0])).toBe(false);
      // get
      expect(wrapped[0].foo).toBe(1);
      // has
      expect(0 in wrapped).toBe(true);
      // ownKeys
      expect(Object.keys(wrapped)).toEqual(['0']);
    });

    it('should not allow mutation', () => {
      // 不是 any 后面会类型报错
      const wrapped: any = readonly([{ foo: 1 }]);
      wrapped[0] = 1;
      expect(wrapped[0]).not.toBe(1);
      expect(
        `Set operation on key "0" failed: target is readonly.`,
        // @ts-ignore
      ).toHaveBeenWarned();
      wrapped[0].foo = 2;
      expect(wrapped[0].foo).toBe(1);
      expect(
        `Set operation on key "foo" failed: target is readonly.`,
        // @ts-ignore
      ).toHaveBeenWarned();

      // should block length mutation
      wrapped.length = 0;
      expect(wrapped.length).toBe(1);
      expect(wrapped[0].foo).toBe(1);
      expect(
        `Set operation on key "length" failed: target is readonly.`,
        // @ts-ignore
      ).toHaveBeenWarned();

      // mutation methods invoke set/length internally and thus are blocked as well
      wrapped.push(2);
      expect(wrapped.length).toBe(1);
      // push triggers two warnings on [1] and .length
      // @ts-ignore
      expect(`target is readonly.`).toHaveBeenWarnedTimes(5);
    });

    it('should not trigger effects', () => {
      const wrapped: any = readonly([{ a: 1 }]);
      let dummy;
      effect(() => {
        dummy = wrapped[0].a;
      });
      expect(dummy).toBe(1);
      wrapped[0].a = 2;
      expect(wrapped[0].a).toBe(1);
      expect(dummy).toBe(1);
      // @ts-ignore
      expect(`target is readonly`).toHaveBeenWarnedTimes(1);
      wrapped[0] = { a: 2 };
      expect(wrapped[0].a).toBe(1);
      expect(dummy).toBe(1);
      // @ts-ignore
      expect(`target is readonly`).toHaveBeenWarnedTimes(2);
    });
  });

  describe('readonly Map/weakMap', () => {
    it('should make nested values readonly', () => {
      const key1 = {};
      const key2 = {};
      // const original = new Map([
      //   [key1, {}],
      //   [key2, {}]
      // ])
      const original = new WeakMap([
        [key1, {}],
        [key2, {}],
      ]);
      const wrapped = readonly(original);
      expect(wrapped).not.toBe(original);
      expect(isProxy(wrapped)).toBe(true);
      expect(isReactive(wrapped)).toBe(false);
      expect(isReadonly(wrapped)).toBe(true);
      expect(isReactive(original)).toBe(false);
      expect(isReadonly(original)).toBe(false);
      expect(isReactive(wrapped.get(key1))).toBe(false);
      expect(isReadonly(wrapped.get(key1))).toBe(true);
      expect(isReactive(original.get(key1))).toBe(false);
      expect(isReadonly(original.get(key1))).toBe(false);
    });

    it('should not allow mutation & not trigger effect', () => {
      const map: any = readonly(new Map());
      // const map = readonly(new WeakMap());
      const key = {};
      let dummy;
      effect(() => {
        dummy = map.get(key);
      });
      expect(dummy).toBeUndefined();
      map.set(key, 1);
      expect(dummy).toBeUndefined();
      expect(map.has(key)).toBe(false);
      expect(
        `Set operation on key "${key}" failed: target is readonly.`,
        // @ts-ignore
      ).toHaveBeenWarned();
    });

    it('readonly + reactive should make get() value also readonly + reactive', () => {
      const map = reactive(new Map());
      // const map = reactive(new WeakMap());
      const roMap = readonly(map);
      const key = {};
      map.set(key, {});

      const item = map.get(key);
      expect(isReactive(item)).toBe(true);
      expect(isReadonly(item)).toBe(false);

      const roItem = roMap.get(key);
      expect(isReactive(roItem)).toBe(true);
      expect(isReadonly(roItem)).toBe(true);
    });

    it('readonly + reactive should make get() value also readonly + reactive', () => {
      // const map = reactive(new Map())
      const map = reactive(new WeakMap());
      const roMap = readonly(map);
      const key = {};
      map.set(key, {});

      const item = map.get(key);
      expect(isReactive(item)).toBe(true);
      expect(isReadonly(item)).toBe(false);

      const roItem = roMap.get(key);
      expect(isReactive(roItem)).toBe(true);
      expect(isReadonly(roItem)).toBe(true);
    });
  });

  describe('readonly set/weakSet', () => {
    test('should make nested values readonly', () => {
      const key1 = {};
      const key2 = {};
      // const original = new Set([key1, key2])
      const original = new WeakSet([key1, key2]);
      const wrapped = readonly(original);
      expect(wrapped).not.toBe(original);
      expect(isProxy(wrapped)).toBe(true);
      expect(isReactive(wrapped)).toBe(false);
      expect(isReadonly(wrapped)).toBe(true);
      expect(isReactive(original)).toBe(false);
      expect(isReadonly(original)).toBe(false);
      expect(wrapped.has(reactive(key1))).toBe(true);
      expect(original.has(reactive(key1))).toBe(false);
    });

    test('should not allow mutation & not trigger effect', () => {
      // 不是 any 后面会类型报错
      const set: any = readonly(new Set());
      // const set = readonly(new WeakSet())
      const key = {};
      let dummy;
      effect(() => {
        dummy = set.has(key);
      });
      expect(dummy).toBe(false);
      set.add(key);
      expect(dummy).toBe(false);
      expect(set.has(key)).toBe(false);
      expect(
        `Add operation on key "${key}" failed: target is readonly.`,
        // @ts-ignore
      ).toHaveBeenWarned();
    });
  });
});
