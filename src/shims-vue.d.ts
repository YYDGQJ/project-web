// 为 TypeScript 声明 .vue 单文件组件模块类型。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
