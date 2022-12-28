### patch 过程

主要分析 `有状态组件`

`mount` 后进入 `patch`, `patch` 主要做的事, 就是根据 `vnode`上的 `type, shapeFlag` 进入到不同的分支, `有状态组件的shapeFlag` 为 4, 会进入 `processComponent` 这个方法, 这个方法主要做的是根据`n1(第一个参数)` 的有无 判断进入`mount` 还是 `update`, 对应的方法是 `mountComponent`, `updateComponent`
