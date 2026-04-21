/** 使用画布上下文测量字符串在指定字号下的像素宽度（模块级单例） */
export const measureLabelWidth = (() => {
  let ctx: CanvasRenderingContext2D | null = null
  return (text: string) => {
    if (typeof document === 'undefined') {
      return Math.max(40, text.length * 14)
    }
    if (!ctx) {
      const canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d')
      if (ctx) ctx.font = '14px sans-serif'
    }
    if (!ctx) return Math.max(40, text.length * 14)
    return Math.ceil(ctx.measureText(text).width)
  }
})()

export const measureLabelWidth12 = (() => {
  let ctx12: CanvasRenderingContext2D | null = null
  return (text: string) => {
    if (typeof document === 'undefined') {
      return Math.max(40, text.length * 12)
    }
    if (!ctx12) {
      const canvas = document.createElement('canvas')
      ctx12 = canvas.getContext('2d')
      if (ctx12) ctx12.font = '12px sans-serif'
    }
    if (!ctx12) return Math.max(40, text.length * 12)
    return Math.ceil(ctx12.measureText(text).width)
  }
})()

// 根据列标题文本估算最小列宽，避免标题被截断

export function getColumnTextMinWidth(label: string): number {
  return measureLabelWidth(label || '') + 34
}
