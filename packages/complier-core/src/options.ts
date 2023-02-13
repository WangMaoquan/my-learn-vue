import { NodeTransform } from './transform';

export interface TransformOptions {
	nodeTransforms?: NodeTransform[]; // 存储着 对 ast 节点的处理方法 (plugin)
}
