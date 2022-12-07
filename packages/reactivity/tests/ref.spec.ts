import { effect } from '../src/effect';
import { isReactive, isShallow, reactive } from '../src/reactive';
import {
  customRef,
  isRef,
  proxyRefs,
  Ref,
  ref,
  shallowRef,
  toRef,
  toRefs,
  triggerRef,
  unref,
} from '../src/ref';
import { computed } from '../src/computed';

describe('reactivity/ref', () => {
  it('ref', () => {
    const count = ref(1);
    expect(count.value).toBe(1);
  });

  it('should be reactive', () => {
    const a = ref(1);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value;
    });
    expect(calls).toBe(1);
    expect(dummy).toBe(1);
    a.value = 2;
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    // same value should not trigger
    a.value = 2;
    expect(calls).toBe(2);
  });

  it('should make nested properties reactive', () => {
    const a = ref({
      count: 1,
    });
    let dummy;
    effect(() => {
      dummy = a.value.count;
    });
    expect(dummy).toBe(1);
    a.value.count = 2;
    expect(dummy).toBe(2);
  });

  it('isRef', () => {
    const count = ref(1);
    expect(isRef(count)).toBe(true);

    const state = ref({
      age: 1,
      like: ref(['music']),
    });
    expect(isRef(state)).toBe(true);

    // 数组是不需要.value 的
    expect(isRef(state.value.like)).toBe(false);
  });

  it('unref', () => {
    const count = ref(1);
    expect(unref(count)).toBe(1);
  });

  it('proxyRefs', () => {
    const original = {
      age: 10,
      like: ref(['music']),
    };

    const proxyRefsResult = proxyRefs(original);

    expect(proxyRefsResult.age).toBe(10);
    expect(proxyRefsResult.like).toEqual(['music']);

    proxyRefsResult.like = ['sing'];
    proxyRefsResult.age = 20;
    expect(proxyRefsResult.age).toBe(20);
    expect(proxyRefsResult.like).toEqual(['sing']);
  });

  it('should work without initial value', () => {
    const a = ref();
    let dummy;
    effect(() => {
      dummy = a.value;
    });
    expect(dummy).toBe(undefined);
    a.value = 2;
    expect(dummy).toBe(2);
  });

  it('should work like a normal property when nested in a reactive object', () => {
    const a = ref(1);
    const obj = reactive({
      a,
      b: {
        c: a,
      },
    });

    let dummy1: number;
    let dummy2: number;

    effect(() => {
      dummy1 = obj.a;
      dummy2 = obj.b.c;
    });

    const assertDummiesEqualTo = (val: number) =>
      [dummy1, dummy2].forEach((dummy) => expect(dummy).toBe(val));

    assertDummiesEqualTo(1);
    a.value++;
    assertDummiesEqualTo(2);
    obj.a++;
    assertDummiesEqualTo(3);
    // obj.b.c++
    // assertDummiesEqualTo(4)
  });

  it('should unwrap nested ref in types', () => {
    const a = ref(0);
    const b = ref(a);

    const c = b.value + 1;

    expect(typeof c).toBe('number');
  });

  it('should NOT unwrap ref types nested inside arrays', () => {
    const arr = ref([1, ref(3)]).value;
    expect(isRef(arr[0])).toBe(false);
    expect(isRef(arr[1])).toBe(true);
    expect((arr[1] as Ref).value).toBe(3);
  });

  it('should unwrap ref types as props of arrays', () => {
    const arr = [ref(0)];
    const symbolKey = Symbol('');
    arr['' as any] = ref(1);
    arr[symbolKey as any] = ref(2);
    const arrRef = ref(arr).value;
    expect(isRef(arrRef[0])).toBe(true);
    expect(isRef(arrRef['' as any])).toBe(false);
    expect(isRef(arrRef[symbolKey as any])).toBe(false);
    expect(arrRef['' as any]).toBe(1);
    expect(arrRef[symbolKey as any]).toBe(2);
  });

  it('should keep tuple types', () => {
    const tuple: [number, string, { a: number }, () => number, Ref<number>] = [
      0,
      '1',
      { a: 1 },
      () => 0,
      ref(0),
    ];
    const tupleRef = ref(tuple);

    tupleRef.value[0]++;
    expect(tupleRef.value[0]).toBe(1);
    tupleRef.value[1] += '1';
    expect(tupleRef.value[1]).toBe('11');
    tupleRef.value[2].a++;
    expect(tupleRef.value[2].a).toBe(2);
    expect(tupleRef.value[3]()).toBe(0);
    tupleRef.value[4].value++;
    expect(tupleRef.value[4].value).toBe(1);
  });

  it('should keep symbols', () => {
    const customSymbol = Symbol();
    const obj = {
      [Symbol.asyncIterator]: ref(1),
      [Symbol.hasInstance]: { a: ref('a') },
      [Symbol.isConcatSpreadable]: { b: ref(true) },
      [Symbol.iterator]: [ref(1)],
      [Symbol.match]: new Set<Ref<number>>(),
      [Symbol.matchAll]: new Map<number, Ref<string>>(),
      [Symbol.replace]: { arr: [ref('a')] },
      [Symbol.search]: { set: new Set<Ref<number>>() },
      [Symbol.species]: { map: new Map<number, Ref<string>>() },
      [Symbol.split]: new WeakSet<Ref<boolean>>(),
      [Symbol.toPrimitive]: new WeakMap<Ref<boolean>, string>(),
      [Symbol.toStringTag]: { weakSet: new WeakSet<Ref<boolean>>() },
      [Symbol.unscopables]: { weakMap: new WeakMap<Ref<boolean>, string>() },
      [customSymbol]: { arr: [ref(1)] },
    };

    const objRef = ref(obj);

    const keys: (keyof typeof obj)[] = [
      Symbol.asyncIterator,
      Symbol.hasInstance,
      Symbol.isConcatSpreadable,
      Symbol.iterator,
      Symbol.match,
      Symbol.matchAll,
      Symbol.replace,
      Symbol.search,
      Symbol.species,
      Symbol.split,
      Symbol.toPrimitive,
      Symbol.toStringTag,
      Symbol.unscopables,
      customSymbol,
    ];

    keys.forEach((key) => {
      // 因为是ref 如果没有判断key 是内置symbolkey 或者是不需要 track的key
      // 会走getter 的 isRef 逻辑, 这里直接返回.value
      expect(objRef.value[key]).toStrictEqual(obj[key]);
    });
  });

  test('shallowRef', () => {
    /**
     * ShallowRef 推导类型时 也需要一个唯一的 symbol key
     * 1. new RefImpl 时需要多加一个参数 __v_isShallow
     * 2. set 的时候需要判断 this.__v_isShallow
     */
    const sref = shallowRef({ a: 1 });
    expect(isReactive(sref.value)).toBe(false);

    let dummy;
    effect(() => {
      dummy = sref.value.a;
    });
    expect(dummy).toBe(1);

    sref.value = { a: 2 };
    expect(isReactive(sref.value)).toBe(false);
    expect(dummy).toBe(2);
  });

  test('shallowRef force trigger', () => {
    /**
     * triggerRef 我们应该怎样去实现?
     * 功能是 传入一个ref, 然后能够触发 它 的dep 里面收集的reactiveEffect
     * 所以我们只需要 把ref.dep 传个我们的triggerEffects
     *
     */
    const sref = shallowRef({ a: 1 });
    let dummy;
    effect(() => {
      dummy = sref.value.a;
    });
    expect(dummy).toBe(1);

    sref.value.a = 2;
    expect(dummy).toBe(1); // should not trigger yet

    // force trigger
    triggerRef(sref);
    expect(dummy).toBe(2);
  });

  test('shallowRef isShallow', () => {
    expect(isShallow(shallowRef(1))).toBe(true);
    expect(isShallow(shallowRef({ a: 1 }))).toBe(true);
  });

  test('isRef', () => {
    expect(isRef(ref(1))).toBe(true);
    expect(isRef(computed(() => 1))).toBe(true);

    expect(isRef(0)).toBe(false);
    expect(isRef(1)).toBe(false);
    // an object that looks like a ref isn't necessarily a ref
    expect(isRef({ value: 0 })).toBe(false);
  });

  test('toRef', () => {
    /**
     * toRef 是干嘛的?
     * 将一个reactiveOject的 指定key 转换成ref
     * 接收的参数有两个 第一个是reactiveObject, 第二个是key
     * 返回的是一个 ref
     */
    const a = reactive({
      x: 1,
    });
    const x = toRef(a, 'x');
    expect(isRef(x)).toBe(true);
    expect(x.value).toBe(1);

    // source -> proxy
    a.x = 2;
    expect(x.value).toBe(2);

    // proxy -> source
    x.value = 3;
    expect(a.x).toBe(3);

    // reactivity
    let dummyX;
    effect(() => {
      dummyX = x.value;
    });
    expect(dummyX).toBe(x.value);

    // mutating source should trigger effect using the proxy refs
    a.x = 4;
    expect(dummyX).toBe(4);

    // should keep ref
    const r = { x: ref(1) };
    expect(toRef(r, 'x')).toBe(r.x);
  });

  test('toRef default value', () => {
    // 只需要加一个参数 并且在get 的时候判断
    const a: { x: number | undefined } = { x: undefined };
    const x = toRef(a, 'x', 1);
    expect(x.value).toBe(1);

    a.x = 2;
    expect(x.value).toBe(2);

    a.x = undefined;
    expect(x.value).toBe(1);
  });

  test('toRefs', () => {
    /**
     * toRef 用于将reactObjec的每一个key 用 toRef 包一层, 然后返回一个对象
     * 我们只需要用一个新的对象 存储 热activeObject key 做key, toRef 后的值 做value 就行
     */
    const a = reactive({
      x: 1,
      y: 2,
    });

    const { x, y } = toRefs(a);

    expect(isRef(x)).toBe(true);
    expect(isRef(y)).toBe(true);
    expect(x.value).toBe(1);
    expect(y.value).toBe(2);

    // source -> proxy
    a.x = 2;
    a.y = 3;
    expect(x.value).toBe(2);
    expect(y.value).toBe(3);

    // proxy -> source
    x.value = 3;
    y.value = 4;
    expect(a.x).toBe(3);
    expect(a.y).toBe(4);

    // reactivity
    let dummyX, dummyY;
    effect(() => {
      dummyX = x.value;
      dummyY = y.value;
    });
    expect(dummyX).toBe(x.value);
    expect(dummyY).toBe(y.value);

    // mutating source should trigger effect using the proxy refs
    a.x = 4;
    a.y = 5;
    expect(dummyX).toBe(4);
    expect(dummyY).toBe(5);
  });

  test('toRefs should warn on plain object', () => {
    // toRefs 不能对没有响应式对象处理
    toRefs({});
    // @ts-ignore
    expect(`toRefs() expects a reactive object`).toHaveBeenWarned();
  });

  test('toRefs should warn on plain array', () => {
    toRefs([]);
    // @ts-ignore
    expect(`toRefs() expects a reactive object`).toHaveBeenWarned();
  });

  test('toRefs reactive array', () => {
    const arr = reactive(['a', 'b', 'c']);
    const refs = toRefs(arr);

    expect(Array.isArray(refs)).toBe(true);

    refs[0].value = '1';
    expect(arr[0]).toBe('1');

    arr[1] = '2';
    expect(refs[1].value).toBe('2');
  });

  test('customRef', () => {
    /**
     * customRef 功能是 传入一个方法 返回一个对象
     * 传入的方法有两个可用的参数, 可用于自定义 的去触发收集依赖,派发更新
     */
    let value = 1;
    let _trigger: () => void;

    const custom = customRef((track, trigger) => ({
      get() {
        track();
        return value;
      },
      set(newValue: number) {
        value = newValue;
        _trigger = trigger;
      },
    }));

    expect(isRef(custom)).toBe(true);

    let dummy;
    effect(() => {
      dummy = custom.value;
    });
    expect(dummy).toBe(1);

    custom.value = 2;
    // should not trigger yet
    expect(dummy).toBe(1);

    _trigger!();
    expect(dummy).toBe(2);
  });
});
