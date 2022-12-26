### 开始

我们通过 vue 官方的脚手架创建的 vue 项目, 在 **mian.(js | ts)** 中都会运用到一个方法 **createApp** , 下面跟随我开始一步一步的进入到里面

> ps: 这个方法是在 runtime-dom 这个包里面 export 的

大致的执行顺序如下

1. createApp runtime-dom/src/index.ts
   主要调用 `ensureRenderer` 返回 ` renderer` 的 `createApp` 方法
   1. ensureRenderer runtime-dom/src/index.ts
      - 缓存第一次创建的`renderer`
   2. createRenderer runtim-core/src/renderer.ts
      - 调用 `baseCreateRenderer` 方法
   3. baseCreateRenderer runtime-core/src/renderer.ts
      - 通过参数 `renderOptions` 来实现 处理各个平台对元素的 `增/删/查/改` 操作, 最后返回的 一个包好 `render` 和 `createApp` 方法的对象, 这里的 `createApp` 是执行 `createAppApi` 返回的
   4. apiCreateApp runtime-core/src/createAppApi.ts
      - 返回一个方法, 这个方法用于创建 `App` 对象, 可以理解为应用的实例. 具体 app 对象包含的属性, 我会在后面实现的时候增加注释
2. 重写返回 `App` 的 `mount` 方法, 项目中 `createApp(App).mount` 就是调用的重写的, 主要做了 清空挂载的 `#app` 的 `innerHtml` 调用原本的 `mount` 方法, 下面原本的 mount 方法的执行顺序
   1. mount runtime-core/src/apiCreateApp.ts
      - 判断当前组件的 `isMounted` 状态, 为 `true` 抛出警告, 为 `false` 则执行挂载操作, `render` 方法的 三个参数 依次为 `vnode` 根组件的虚拟 DOM, `hostElement` 挂载的 DOM, `isSVG` 是否是 SVG 元素, 所以我们需要先生成 根组件的 `vnode` 级调用 `createVNode` 方法
        1. createVNode runtime-core/src/vnode.ts
           这个方法是在开发环境是会多包一层, 最主要的还是调用了 `_createVNode` 这个方法
        2. \_createVNode runtime-core/src/vnode.ts
           会在调用 `baseCreateVNode` 之前 对参数做处理, 比如判断该组件的 `type` 是否是合法的类型, 再比如 如果已经是 `vnode` 了 直接 `clone` 一份返回, 会判断是否是 `classComponent` 处理 `props`, 生成对应的 `shapeFlag`,
        3. baseCreateVNode runtime-core/src/vnode.ts
           生成一个 vnode, 具体有哪些属性, 后面实现直接看对应文件
   2. render runtime-core/src/renderer.ts
      根据参数 `vnode` 是否是 `null` 来判断是执行 `unmount` 还是 `patch`
      1. unmount runtime-core/src/renderer.ts
         判断啥的, 最后其实就是执行我们 `renderOptions` 的 `remove`
      2. patch runtime-core/src/renderer.ts
         根据 `vnode` 不同 `type` 去执行对应`type` 的 `processXXX` 方法, 比如 `type 为 Text` 就去执行 `processText`,
