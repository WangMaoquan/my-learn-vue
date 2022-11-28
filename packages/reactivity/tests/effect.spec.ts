import { effect, stop } from '../src/effect';
import { reactive } from '../src/reactive';

describe('effect', () => {
  // 1. effect 会执行一遍传入fn
  // 2. reactiveObject 派发更新时 会再次执行effect 传入的fn
  it('test', () => {
    const user = reactive({
      age: 10,
    });

    let nextAge;
    effect(() => {
      nextAge = user.age + 1;
    });

    expect(nextAge).toBe(11);

    // 测试update
    user.age++;
    expect(nextAge).toBe(12);
  });

  it('effect runner', () => {
    // 1. effect 会返回一个runner 方法, 执行runner 会执行传入的fn 延迟执行想到什么 => bind call
    // 2. 执行runner 的返回值 就是 fn的返回值
    let count = 10;
    const runner = effect(() => {
      count++;
      return 'effect runner';
    });
    expect(count).toBe(11);
    const runnerResult = runner();
    expect(count).toBe(12);
    expect(runnerResult).toBe('effect runner');
  });

  it('scheduler', () => {
    // 1. effect 除了传入的fn 还有第二个参数 
    // 2. 当第二个参数传入中存在 scheduler时 第二次执行的就不会是effect的runner 而是 scheduler, 执行的时期在 trigger
    let dummy;
    let run: any;
    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler },
    );
    // 第一次调用不会执行 scheduler  执行的是run 方法
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    // 存在scheduler 时 优先级比 run 优先级更高, trigger的时候需要判断下effect 上是否存在scheduler, 存在就调用scheduler, 不存在就执行run方法ß
    expect(scheduler).toHaveBeenCalledTimes(1);
    // should not run yet
    expect(dummy).toBe(1);
    // manually run
    run();
    // should have run
    expect(dummy).toBe(2);
  });

  it('stop', () => {
    // effect 存在一个stop方法, 当执行stop 方法后 依赖发生变化 也不会执行当前这个 effect
    // 当重新执行runner时, 依赖发生变化 便会重新执行effect
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    stop(runner)
    // obj.prop = 3
    // 执行obj.props++ 会先触发get 收集依赖可以理解为执行了runner, 
    // 但是已经stop得情况下 不应该再被收集
    obj.prop++;
    expect(dummy).toBe(2)
    // stopped effect should still be manually callable
    runner()
    expect(dummy).toBe(3)
  });

  it('events: onStop', () => {
    // effect 第二个参数 存在onstop 时需要执行, 啥时候执行 => 执行stop 的时候
    const onStop = jest.fn()
    const runner = effect(() => {}, {
      onStop
    })

    stop(runner)
    expect(onStop).toHaveBeenCalled()
  })

  it('should allow explicitly recursive raw function loops', () => {
    const counter = reactive({ num: 0 })
    const numSpy = jest.fn(() => {
      counter.num++
      if (counter.num < 10) {
        numSpy()
      }
    })
    effect(numSpy)
    expect(counter.num).toEqual(10)
    expect(numSpy).toHaveBeenCalledTimes(10)
  })

  it('should avoid infinite loops with other effects', () => {
    const nums = reactive({ num1: 0, num2: 1 })

    const spy1 = jest.fn(() => (nums.num1 = nums.num2))
    const spy2 = jest.fn(() => (nums.num2 = nums.num1))
    effect(spy1)
    effect(spy2)
    expect(nums.num1).toBe(1)
    expect(nums.num2).toBe(1)
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy2).toHaveBeenCalledTimes(1)
    nums.num2 = 4
    expect(nums.num1).toBe(4)
    expect(nums.num2).toBe(4)
    expect(spy1).toHaveBeenCalledTimes(2)
    expect(spy2).toHaveBeenCalledTimes(2)
    nums.num1 = 10
    expect(nums.num1).toBe(10)
    expect(nums.num2).toBe(10)
    expect(spy1).toHaveBeenCalledTimes(3)
    expect(spy2).toHaveBeenCalledTimes(3)
  })
});
