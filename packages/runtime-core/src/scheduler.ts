import { ComponentInternalInstance } from './component';

export interface SchedulerJob extends Function {
	id?: number; // id 后面会根据这个id 排序
	pre?: boolean; // 是否先
	active?: boolean; // 是否是激活
	computed?: boolean; // 是否是computed
	allowRecurse?: boolean; // 是否允许递归  用户没有按照单向数据流 子组件会造成父组件的更新 这样就是需要递归
	ownerInstance?: ComponentInternalInstance; // 自己当前的实例
}
