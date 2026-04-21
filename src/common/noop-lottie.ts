/**
 * 为无动画运行环境提供最小兼容实现，避免业务代码在 SSR / 依赖缺失时崩溃。
 */
type AnimationHandle = {
  destroy: () => void
  play: () => void
  stop: () => void
  pause: () => void
  setSpeed: (_speed: number) => void
  setDirection: (_direction: number) => void
  goToAndStop: (_value: number, _isFrame?: boolean) => void
  goToAndPlay: (_value: number, _isFrame?: boolean) => void
}

// 返回一个“空对象句柄”，统一兜底所有动画调用。
const createAnimationHandle = (): AnimationHandle => ({
  destroy: () => {},
  play: () => {},
  stop: () => {},
  pause: () => {},
  setSpeed: () => {},
  setDirection: () => {},
  goToAndStop: () => {},
  goToAndPlay: () => {}
})

// 与 lottie-web 常用 API 保持同名，便于无缝替换。
const noopLottie = {
  loadAnimation: () => createAnimationHandle(),
  destroy: () => {},
  play: () => {},
  stop: () => {},
  pause: () => {},
  setSpeed: () => {},
  setDirection: () => {}
}

export default noopLottie
