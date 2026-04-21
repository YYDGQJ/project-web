import { ref, computed, watch } from 'vue'

interface PaginationProps {
  currentPage: number
  pageSizes: number[]
  total: number
  paginationEnabled?: boolean
  paginationLayout?: string
  data: any[]
}

type PaginationEmit = (
  event: string,
  ...args: any[]
) => void

// 管理分页状态：页码、页大小与布局规则

export function usePagination(props: PaginationProps, emit: PaginationEmit) {
  const internalCurrentPage = ref(props.currentPage)
  const internalPageSize = ref(props.pageSizes[0] ?? 100)
  const pendingPaginationReload = ref(false)

  const isPaginationEnabled = computed(() => props.paginationEnabled !== false)

  // 切换页码并通知外部拉取对应页数据

  const handleCurrentPageChange = (value: number) => {
    internalCurrentPage.value = value
    pendingPaginationReload.value = true
    emit('update:currentPage', value)
    emit('pagination-change', {
      currentPage: value,
      pageSize: internalPageSize.value,
      reason: 'page'
    })
  }

  // 切换每页条数并回到第一页

  const handlePageSizeChange = (value: number) => {
    internalPageSize.value = value
    if (internalCurrentPage.value !== 1) {
      internalCurrentPage.value = 1
    }
    pendingPaginationReload.value = true
    emit('update:pageSize', value)
    emit('pagination-change', {
      currentPage: internalCurrentPage.value,
      pageSize: value,
      reason: 'size'
    })
  }

  // 外部触发重置分页到第一页

  const resetPagination = () => {
    internalCurrentPage.value = 1
    pendingPaginationReload.value = true
    emit('update:currentPage', 1)
    emit('pagination-change', {
      currentPage: 1,
      pageSize: internalPageSize.value,
      reason: 'reset'
    })
  }

  const resolvedPaginationLayout = computed(() => {
    // 过滤掉不支持的分页布局项
    const tokens = (props.paginationLayout || '')
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token && token !== 'jumper' && token !== 'total')
    if (!tokens.length) return 'prev, pager, next, sizes'
    return tokens.join(', ')
  })

  watch(
    () => props.data,
    () => {
      if (pendingPaginationReload.value) {
        pendingPaginationReload.value = false
        return
      }
      internalCurrentPage.value = 1
    }
  )

  return {
    internalCurrentPage,
    internalPageSize,
    pendingPaginationReload,
    isPaginationEnabled,
    handleCurrentPageChange,
    handlePageSizeChange,
    resetPagination,
    resolvedPaginationLayout
  }
}
