<template>
  <div
    v-if="visible && activeColumn"
    class="common-table-header-filter-panel"
    :style="panelStyle"
    @click.stop
  >
    <div class="common-table-filter-panel__toolbar">
      <button
        type="button"
        class="common-table-filter-btn"
        @click="emit('select-all', activeColumn.key, filteredFilterOptions)"
      >
        全选
      </button>
      <button
        type="button"
        class="common-table-filter-btn common-table-filter-btn--invert"
        @click="emit('invert', activeColumn.key, filteredFilterOptions)"
      >
        反选
      </button>
    </div>
    <el-input
      v-model="filterQuery"
      clearable
      size="small"
      class="common-table-filter-panel__search"
      placeholder="查询当前筛选项"
    />
    <el-checkbox-group
      :model-value="normalizedDraftValues"
      class="common-table-filter-panel__group"
      @update:model-value="handleDraftValueChange"
    >
      <el-checkbox
        v-for="option in filteredFilterOptions"
        :key="`header-filter-value-${activeColumn.key}-${option.value}`"
        :value="toCheckboxValue(option.value)"
        class="common-table-filter-panel__option"
      >
        {{ option.text }}
      </el-checkbox>
    </el-checkbox-group>
    <div v-if="!filteredFilterOptions.length" class="common-table-panel__empty">
      无匹配项
    </div>
    <div class="common-table-filter-panel__footer">
      <button
        type="button"
        class="common-table-filter-btn common-table-filter-btn--primary"
        @click="emit('confirm')"
      >
        确定
      </button>
      <button
        type="button"
        class="common-table-filter-btn"
        @click="emit('reset')"
      >
        重置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 组件说明：TableHeaderFilterPanel 组件，负责当前页面的结构与交互。
import { computed, ref } from 'vue'
import type { CheckboxValueType } from 'element-plus'
import type { CSSProperties } from 'vue'
import type { EnhancedColumn, FilterValue } from '../types'

const props = defineProps<{
  visible: boolean
  activeColumn: EnhancedColumn | null
  filterOptions: Array<{ text: string; value: FilterValue }>
  panelStyle: CSSProperties | Record<string, string>
  draftValues: FilterValue[]
}>()

const emit = defineEmits<{
  'draft-change': [values: FilterValue[]]
  'confirm': []
  'reset': []
  'select-all': [key: string, options: Array<{ text: string; value: FilterValue }>]
  'invert': [key: string, options: Array<{ text: string; value: FilterValue }>]
}>()

const BOOLEAN_TRUE_TOKEN = '__common_table_true__'
const BOOLEAN_FALSE_TOKEN = '__common_table_false__'
const filterQuery = ref('')

const normalizedFilterQuery = computed(() => filterQuery.value.trim().toLowerCase())
const safeFilterOptions = computed(() => props.filterOptions ?? [])

const filteredFilterOptions = computed(() => {
  if (!normalizedFilterQuery.value) return safeFilterOptions.value
  return safeFilterOptions.value.filter((option) =>
    String(option.text ?? '').toLowerCase().includes(normalizedFilterQuery.value)
  )
})

const toCheckboxValue = (value: FilterValue): string | number => {
  if (typeof value === 'boolean') {
    return value ? BOOLEAN_TRUE_TOKEN : BOOLEAN_FALSE_TOKEN
  }
  return value
}

const fromCheckboxValue = (value: CheckboxValueType): FilterValue => {
  if (value === BOOLEAN_TRUE_TOKEN) {
    return true
  }
  if (value === BOOLEAN_FALSE_TOKEN) {
    return false
  }
  return value
}

const normalizedDraftValues = computed<(string | number)[]>(() =>
  props.draftValues.map((value) => toCheckboxValue(value))
)

const handleDraftValueChange = (values: CheckboxValueType[]) => {
  emit('draft-change', values.map((value) => fromCheckboxValue(value)))
}
</script>
