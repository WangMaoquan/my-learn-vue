import { effect } from "../src/effect";
import { reactive } from "../src/reactive";

describe('effect', () => {
  it('test', () => {
    const user = reactive({
      age: 10,
    })

    let nextAge;
    effect(() => {
      nextAge = user.age + 1;
    })

    expect(nextAge).toBe(11)

    // 测试update
    user.age++;
    expect(nextAge).toBe(12);
  })

  it('effect runner', () => {
    let count = 10;
    const runner = effect(() => {
      count++;
      return "effect runner"
    });
    expect(count).toBe(11);
    const runnerResult = runner();
    expect(count).toBe(12);
    expect(runnerResult).toBe('effect runner')
  })
})