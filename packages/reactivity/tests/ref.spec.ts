import { effect } from '../src/effect';
import { reactive } from '../src/reactive';
import { isRef, proxyRefs, Ref, ref, unref } from  '../src/ref'

describe('reactivity/ref', () => {
  it('ref', () => {
    const count = ref(1);
    expect(count.value).toBe(1);
  })

  it('should be reactive', () => {
    const a = ref(1)
    let dummy
    let calls = 0
    effect(() => {
      calls++
      dummy = a.value
    })
    expect(calls).toBe(1)
    expect(dummy).toBe(1)
    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2)
    // same value should not trigger
    a.value = 2
    expect(calls).toBe(2)
  })

  it('should make nested properties reactive', () => {
    const a = ref({
      count: 1
    })
    let dummy
    effect(() => {
      dummy = a.value.count
    })
    expect(dummy).toBe(1)
    a.value.count = 2
    expect(dummy).toBe(2)
  })

  it('isRef', () => {
    const count = ref(1);
    expect(isRef(count)).toBe(true);

    const state = ref({
      age: 1,
      like: ref(['music'])
    });
    expect(isRef(state)).toBe(true);
    
    // 数组是不需要.value 的
    expect(isRef(state.value.like)).toBe(false);
  })

  it('unref', () => {
    const count = ref(1);
    expect(unref(count)).toBe(1);
  })

  it('proxyRefs', () => {
    const original = {
      age: 10,
      like: ref(['music'])
    }

    const proxyRefsResult = proxyRefs(original);

    expect(proxyRefsResult.age).toBe(10);
    expect(proxyRefsResult.like).toEqual(["music"])

    proxyRefsResult.like = ["sing"]
    proxyRefsResult.age = 20;
    expect(proxyRefsResult.age).toBe(20);
    expect(proxyRefsResult.like).toEqual(["sing"])
  })

  it('should work without initial value', () => {
    const a = ref()
    let dummy
    effect(() => {
      dummy = a.value
    })
    expect(dummy).toBe(undefined)
    a.value = 2
    expect(dummy).toBe(2)
  })

  it('should work like a normal property when nested in a reactive object', () => {
    const a = ref(1)
    const obj = reactive({
      a,
      b: {
        c: a
      }
    })

    let dummy1: number
    let dummy2: number

    effect(() => {
      dummy1 = obj.a
      dummy2 = obj.b.c
    })

    const assertDummiesEqualTo = (val: number) =>
      [dummy1, dummy2].forEach(dummy => expect(dummy).toBe(val))

    assertDummiesEqualTo(1)
    a.value++
    assertDummiesEqualTo(2)
    obj.a++
    assertDummiesEqualTo(3)
    // obj.b.c++
    // assertDummiesEqualTo(4)
  })

  it('should unwrap nested ref in types', () => {
    const a = ref(0)
    const b = ref(a)

    const c = b.value + 1;

    expect(typeof c).toBe('number')
  })

  it('should NOT unwrap ref types nested inside arrays', () => {
    const arr = ref([1, ref(3)]).value
    expect(isRef(arr[0])).toBe(false)
    expect(isRef(arr[1])).toBe(true)
    expect((arr[1] as Ref).value).toBe(3)
  })

  it('should unwrap ref types as props of arrays', () => {
    const arr = [ref(0)]
    const symbolKey = Symbol('')
    arr['' as any] = ref(1)
    arr[symbolKey as any] = ref(2)
    const arrRef = ref(arr).value
    expect(isRef(arrRef[0])).toBe(true)
    expect(isRef(arrRef['' as any])).toBe(false)
    expect(isRef(arrRef[symbolKey as any])).toBe(false)
    expect(arrRef['' as any]).toBe(1)
    expect(arrRef[symbolKey as any]).toBe(2)
  })

  it('should keep tuple types', () => {
    const tuple: [number, string, { a: number }, () => number, Ref<number>] = [
      0,
      '1',
      { a: 1 },
      () => 0,
      ref(0)
    ]
    const tupleRef = ref(tuple)

    tupleRef.value[0]++
    expect(tupleRef.value[0]).toBe(1)
    tupleRef.value[1] += '1'
    expect(tupleRef.value[1]).toBe('11')
    tupleRef.value[2].a++
    expect(tupleRef.value[2].a).toBe(2)
    expect(tupleRef.value[3]()).toBe(0)
    tupleRef.value[4].value++
    expect(tupleRef.value[4].value).toBe(1)
  })

  it('should keep symbols', () => {
    const customSymbol = Symbol()
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
      [customSymbol]: { arr: [ref(1)] }
    }

    const objRef = ref(obj)

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
      customSymbol
    ]

    keys.forEach(key => {
      // 因为是ref 如果没有判断key 是内置symbolkey 或者是不需要 track的key
      // 会走getter 的 isRef 逻辑, 这里直接返回.value
      expect(objRef.value[key]).toStrictEqual(obj[key])
    })
  })

})