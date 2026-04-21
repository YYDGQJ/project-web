<template>
  <div v-if="isPaginationEnabled" class="common-table-pagination">
    <div class="common-table-pagination-left">
      <div v-if="activeFilterSummaries.length" class="common-table-filter-summary-list">
        <div
          v-for="summary in activeFilterSummaries"
          :key="`filter-summary-${summary.key}`"
          class="common-table-filter-summary-item"
        >
          <span class="common-table-filter-summary-item__field">{{ summary.label }}:</span>
          <span
            class="common-table-filter-summary-item__values"
            :title="summary.valuesText"
          >{{ summary.valuesText }}</span>
          <button
            type="button"
            class="common-table-filter-summary-item__close"
            @click="emit('clear-filter-summary', summary.key)"
          >×</button>
        </div>
      </div>
    </div>
    <div class="common-table-pagination-right">
      <span v-if="showTotal !== false" class="common-table-pagination-total">共{{ total }}条</span>
      <el-config-provider :locale="zhCn">
        <el-pagination
          size="small"
          background
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="pageSizes"
          :layout="paginationLayout"
          :total="total"
          @current-change="emit('current-change', $event)"
          @size-change="emit('size-change', $event)"
        />
      </el-config-provider>
    </div>
  </div>
</template>

<script setup lang="ts">
// 组件说明：TablePagination 组件，负责当前页面的结构与交互。
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import type { FilterSummaryItem } from '../types'

defineProps<{
  isPaginationEnabled: boolean
  total: number
  currentPage: number
  pageSize: number
  pageSizes: number[]
  paginationLayout: string
  activeFilterSummaries: FilterSummaryItem[]
  showTotal?: boolean
}>()

const emit = defineEmits<{
  'current-change': [value: number]
  'size-change': [value: number]
  'clear-filter-summary': [key: string]
}>()
</script>
