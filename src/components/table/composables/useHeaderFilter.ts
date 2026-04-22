import { ref, computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { EnhancedColumn } from '../types'
import { HEADER_FILTER_PANEL_WIDTH, HEADER_FILTER_ICON_SIZE, VTABLE_CELL_PADDING_LEFT, VTABLE_SORT_ICON_TOTAL_WIDTH } from '../constants'
import { measureLabelWidth12 } from '../utils/measureUtils'

/**
 * 表头筛选 UI 控制器。
 * 负责两件事：
 * 1) 计算筛选按钮锚点（跟随列位置与横向滚动）。
 * 2) 管理筛选面板开关与定位。
 */

export function useHeaderFilter(
  enhancedColumns: ComputedRef<EnhancedColumn[]>,
  visibleOrderedColumns: ComputedRef<EnhancedColumn[]>,
  isColumnSortEnabled: (key: string) => boolean,
  isColumnFilterEnabled: (key: string) => boolean,
  getVtableInstance: () => any,
  vtableRef: ComputedRef<HTMLElement | null>
) {
  const headerFilterAnchors = ref<Array<{ key: string; left: number; top: number }>>([])
  const headerFilterPanelVisible = ref(false)
  const headerFilterPanelKey = ref<string | null>(null)

  // 当前激活列由 panelKey 派生，避免额外维护冗余对象状态。
  const activeHeaderFilterColumn = computed(() => {
    if (!headerFilterPanelKey.value) return null
    return (
      visibleOrderedColumns.value.find((col) => col.key === headerFilterPanelKey.value) ??
      enhancedColumns.value.find((col) => col.key === headerFilterPanelKey.value) ??
      null
    )
  })

  // 面板位置约束：始终限制在容器可视区内，避免越界被裁剪。
  const headerFilterPanelStyle = computed(() => {
    const anchor = headerFilterAnchors.value.find(
      (item) => item.key === headerFilterPanelKey.value
    )
    const containerWidth = vtableRef.value?.clientWidth ?? 0
    const left = anchor
      ? Math.max(8, Math.min(anchor.left - HEADER_FILTER_PANEL_WIDTH + 18, containerWidth - HEADER_FILTER_PANEL_WIDTH - 8))
      : 8
    const top = anchor ? anchor.top + HEADER_FILTER_ICON_SIZE + 8 : 32
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${HEADER_FILTER_PANEL_WIDTH}px`
    }
  })

  // 仅允许“可见 + 启用 + 有候选项”的列渲染筛选按钮。

  const getVisibleFilterColumnKeys = (): string[] => {
    return visibleOrderedColumns.value
      .filter(
        (col) =>
          Boolean(col.prop) &&
          isColumnFilterEnabled(col.key) &&
          Boolean(col.filterOptions?.length)
      )
      .map((col) => col.key)
  }

  // 重新计算按钮锚点：以 VTable 单元格几何信息换算到容器坐标。

  const updateHeaderFilterAnchors = () => {
    const vtableInstance = getVtableInstance()
    if (!vtableInstance || !vtableRef.value) {
      headerFilterAnchors.value = []
      return
    }

    const visibleFilterKeys = new Set(getVisibleFilterColumnKeys())
    const anchors: Array<{ key: string; left: number; top: number }> = []

    const containerOffsetLeft = vtableRef.value.offsetLeft || 0
    const containerOffsetTop = vtableRef.value.offsetTop || 0

    visibleOrderedColumns.value
      .filter((col) => col.prop)
      .forEach((col) => {
        if (!visibleFilterKeys.has(col.key)) return

        const colIndex = vtableInstance.getTableIndexByField?.(col.prop)
        if (!Number.isFinite(colIndex) || colIndex < 0) return

        let headerRowIndex = 0
        for (let r = 0; r <= 3; r += 1) {
          if (vtableInstance.getCellLocation?.(colIndex, r) === 'columnHeader') {
            headerRowIndex = r
            break
          }
        }

        const rect =
          vtableInstance.getCellRelativeRect?.(colIndex, headerRowIndex) ??
          vtableInstance.getCellRect?.(colIndex, headerRowIndex)
        if (!rect) return

        const filterLeft =
          containerOffsetLeft +
          rect.left +
          VTABLE_CELL_PADDING_LEFT +
          measureLabelWidth12(col.label || '') +
          (isColumnSortEnabled(col.key) ? VTABLE_SORT_ICON_TOTAL_WIDTH : 0)

        // 图标落在可视区外时跳过渲染，避免滚动后残留“悬空按钮”。
        if (
          filterLeft < containerOffsetLeft ||
          filterLeft > containerOffsetLeft + (vtableRef.value?.clientWidth ?? 0) - HEADER_FILTER_ICON_SIZE
        ) {
          return
        }

        anchors.push({
          key: col.key,
          left: filterLeft,
          top: Math.max(
            2,
            containerOffsetTop + rect.top + Math.floor((rect.height - HEADER_FILTER_ICON_SIZE) / 2)
          )
        })
      })

    headerFilterAnchors.value = anchors

    // 当列布局频繁重算（如列拖拽、固定列切换）时，锚点可能暂时缺失。
    // 此时不强制关闭面板，避免出现“点击后马上收起”的体验问题。
  }

  // 打开面板前先初始化草稿，确保当前面板展示的是最新应用态。

  const openHeaderFilterPanel = (columnKey: string, setDraftValues: (key: string) => void) => {
    headerFilterPanelKey.value = columnKey
    setDraftValues(columnKey)
    headerFilterPanelVisible.value = true
  }

  // 关闭时清理激活列，防止旧列状态影响下一次打开。

  const closeHeaderFilterPanel = () => {
    headerFilterPanelVisible.value = false
    headerFilterPanelKey.value = null
  }

  // 全局左键关闭策略：点击面板/按钮内部不关闭，其他区域关闭。

  const handleGlobalLeftClickCloseHeaderFilter = (event: MouseEvent) => {
    if (event.button !== 0 || !headerFilterPanelVisible.value) return
    const target = event.target
    if (!(target instanceof Element)) {
      closeHeaderFilterPanel()
      return
    }
    if (target.closest('.common-table-header-filter-panel')) return
    if (target.closest('.common-table-header-filter-btn')) return
    closeHeaderFilterPanel()
  }

  return {
    headerFilterAnchors,
    headerFilterPanelVisible,
    headerFilterPanelKey,
    activeHeaderFilterColumn,
    headerFilterPanelStyle,
    getVisibleFilterColumnKeys,
    updateHeaderFilterAnchors,
    openHeaderFilterPanel,
    closeHeaderFilterPanel,
    handleGlobalLeftClickCloseHeaderFilter
  }
}
