import type { EnhancedColumn } from '../types'

// 按当前可见列与数据状态导出 Excel 文件

export async function exportToExcel(
  exportCols: EnhancedColumn[],
  displayData: any[],
  name: string,
  sheetName: string
): Promise<void> {
  const ExcelJS = await import('exceljs')
  const cols = exportCols.filter((c) => c.prop)

  // 表头行
  const header = cols.map((c) => c.label)

  // 数据行：使用当前过滤/排序后的数据，优先使用格式化函数
  const rows = displayData.map((row) =>
    cols.map((col) => {
      const rawValue = row?.[col.prop as string]
      if (col.formatter) {
        const result = col.formatter(row, col as any, rawValue, 0)
        return result ?? rawValue ?? ''
      }
      return rawValue ?? ''
    })
  )

  const wsData = [header, ...rows]

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  worksheet.addRows(wsData)

  worksheet.columns = cols.map((col, colIdx) => {
    const maxLen = wsData.reduce((max, row) => {
      const cell = String(row[colIdx] ?? '')
      const len = [...cell].reduce((s, c) => s + (c.charCodeAt(0) > 127 ? 2 : 1), 0)
      return Math.max(max, len)
    }, col.label.length * 2)
    return { width: Math.min(maxLen + 2, 50) }
  })

  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }

  const exportName = name || '导出数据'
  const now = new Date()
  // 补零函数：用于生成固定长度时间戳
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${exportName}_${timestamp}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
