<template>
  <div class="common-table-toolbar">
    <div v-if="name" class="common-table-toolbar-title" :title="name">{{ name }}</div>
    <span v-if="name" class="common-table-toolbar-divider" aria-hidden="true"></span>
    <div class="common-table-toolbar-info">
      <slot name="info"></slot>
    </div>

    <div v-if="operationMode === 'create'" class="common-table-toolbar-create-actions">
      <button
        type="button"
        class="common-table-toolbar-btn"
        :disabled="disabled"
        @click="emit('add-row')"
      >
        添加行
      </button>
      <button
        type="button"
        class="common-table-toolbar-btn"
        :disabled="disabled || !hasPendingNewRows"
        @click="emit('remove-new-rows')"
      >
        删除新增行
      </button>
    </div>

    <span class="common-table-toolbar-spacer" aria-hidden="true"></span>

    <button
      v-if="hasTreeData && toolbarConfig.showExpandCollapse !== false"
      type="button"
      class="common-table-toolbar-btn"
      :disabled="disabled"
      @click="emit('expand-all')"
    >
      展开全部
    </button>
    <button
      v-if="hasTreeData && toolbarConfig.showExpandCollapse !== false"
      type="button"
      class="common-table-toolbar-btn"
      :disabled="disabled"
      @click="emit('collapse-all')"
    >
      收起全部
    </button>

    <!-- 列显示（含拖拽排序） -->
    <el-popover v-if="toolbarConfig.showColumnManager !== false" trigger="click" placement="bottom-end" :width="240" popper-class="common-table-toolbar-popper">
      <template #reference>
        <button type="button" class="common-table-toolbar-btn" :disabled="disabled">列显示</button>
      </template>

      <div class="common-table-toolbar-panel">
        <div class="common-table-toolbar-quickbar">
          <button type="button" class="common-table-toolbar-quick-btn" @click="emit('enable-all-visible')">全开</button>
          <button type="button" class="common-table-toolbar-quick-btn" @click="emit('disable-all-visible')">全关</button>
        </div>
        <div class="common-table-toolbar-group common-table-col-order-list">
          <div
            v-for="column in orderedEnhancedColumns"
            :key="`col-order-${column.key}`"
            class="common-table-col-order-item"
            :class="{ 'is-col-drag-over': colDragOverKey === column.key && colDraggingKey !== column.key }"
            draggable="true"
            @dragstart="emit('col-order-drag-start', column.key, $event)"
            @dragover.prevent="emit('col-order-drag-over', column.key)"
            @dragleave="emit('col-order-drag-leave', column.key)"
            @drop.prevent="emit('col-order-drop', column.key)"
            @dragend="emit('col-order-drag-end')"
          >
            <el-checkbox
              :model-value="visibleColumnKeys.includes(column.key)"
              @change="(checked) => handleColumnVisibleChange(column.key, checked)"
              @click.stop
            >
              {{ column.label }}
            </el-checkbox>
          </div>
        </div>
      </div>
    </el-popover>

    <!-- 导出 Excel -->
    <button
      v-if="toolbarConfig.showExport !== false"
      type="button"
      class="common-table-toolbar-btn common-table-toolbar-btn--export"
      :disabled="disabled"
      @click="emit('export')"
    >
      导出 Excel
    </button>
  </div>
</template>

<script setup lang="ts">
// 组件说明：TableToolbar 组件，负责当前页面的结构与交互。
import type { CheckboxValueType } from 'element-plus'
import type { EnhancedColumn } from '../types'

defineProps<{
  name?: string
  hasTreeData: boolean
  orderedEnhancedColumns: EnhancedColumn[]
  visibleColumnKeys: string[]
  colDragOverKey: string | null
  colDraggingKey: string | null
  operationMode: 'idle' | 'edit' | 'create' | 'delete'
  disabled: boolean
  hasPendingNewRows: boolean
  toolbarConfig: {
    showExpandCollapse?: boolean
    showColumnManager?: boolean
    showExport?: boolean
  }
}>()

const emit = defineEmits<{
  'expand-all': []
  'collapse-all': []
  'enable-all-visible': []
  'disable-all-visible': []
  'col-order-drag-start': [key: string, event: DragEvent]
  'col-order-drag-over': [key: string]
  'col-order-drag-leave': [key: string]
  'col-order-drop': [key: string]
  'col-order-drag-end': []
  'toggle-column-visible': [key: string, checked: boolean]
  'export': []
  'add-row': []
  'remove-new-rows': []
}>()

const handleColumnVisibleChange = (key: string, checked: CheckboxValueType) => {
  emit('toggle-column-visible', key, Boolean(checked))
}
</script>
