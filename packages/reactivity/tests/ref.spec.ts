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
})