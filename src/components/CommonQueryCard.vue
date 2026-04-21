<template>
  <el-card shadow="hover" class="common-query-card" :style="cardStyleVars">
    <template v-if="title" #header>
      <div class="common-query-card__header-wrap">
        <div class="common-query-card__header">{{ title }}</div>
        <div class="common-query-card__actions">
          <div v-if="showColumnSetting" class="common-query-card__column-setting">
            <span class="common-query-card__column-setting-label">每行</span>
            <el-input-number
              :model-value="resolvedQueryColumns"
              :min="1"
              :max="12"
              :step="1"
              :controls="false"
              size="small"
              @update:model-value="handleQueryColumnsChange"
            />
            <span class="common-query-card__column-setting-label">项</span>
          </div>
          <el-button v-if="showReset" size="small" @click="emit('reset')">清空查询条件</el-button>
        </div>
      </div>
    </template>

    <el-config-provider :size="'small'">
      <el-form
        v-if="enabledFields.length"
        :model="formModel"
        class="query-form query-form-grid"
        :style="{
          display: 'grid',
          gridTemplateColumns: `repeat(${resolvedQueryColumns}, minmax(0, 1fr))`,
          gap: '8px 12px',
          width: '100%'
        }"
        :label-position="formLabelPosition"
        @submit.prevent="emit('submit')"
      >
        <el-form-item v-for="field in enabledFields" :key="field.model" :label="resolveFieldLabel(field)">
          <el-input
            v-if="field.type === 'input'"
            :model-value="getFieldValue(field.model)"
            :placeholder="field.placeholder"
            clearable
            @update:model-value="(value: any) => setFieldValue(field.model, value)"
          />
          <el-input-number
            v-else-if="field.type === 'inputnumber'"
            :model-value="getFieldValue(field.model)"
            :placeholder="field.placeholder"
            :controls="true"
            @update:model-value="(value: any) => setFieldValue(field.model, value)"
          />
          <el-select
            v-else-if="field.type === 'select'"
            :model-value="getFieldValue(field.model)"
            :placeholder="field.placeholder"
            clearable
            :multiple="field.multi === true"
            collapse-tags
            collapse-tags-tooltip
            @update:model-value="(value: any) => setFieldValue(field.model, value)"
          >
            <el-option
              v-for="opt in field.options || []"
              :key="opt.value"
              :label="`${opt.value}_${opt.label}`"
              :value="opt.value"
            />
          </el-select>
          <el-date-picker
            v-else-if="field.type === 'date'"
            :model-value="getFieldValue(field.model)"
            type="date"
            :placeholder="field.placeholder"
            value-format="YYYY-MM-DD"
            clearable
            @update:model-value="(value: any) => setFieldValue(field.model, value)"
          />
          <el-date-picker
            v-else-if="field.type === 'datetimerange'"
            :model-value="getFieldValue(field.model)"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            clearable
            @update:model-value="(value: any) => setFieldValue(field.model, value)"
          />
          <el-input
            v-else-if="field.type === 'textarea'"
            type="textarea"
            :model-value="getFieldValue(field.model)"
            :placeholder="field.placeholder"
            :rows="field.rows || 2"
            clearable
            @update:model-value="(value: any) => setFieldValue(field.model, value)"
          />
          <el-switch
            v-else-if="field.type === 'switch'"
            :model-value="getFieldValue(field.model)"
            @update:model-value="(value: any) => setFieldValue(field.model, value)"
          />
          <span v-else>未支持类型: {{ field.type }}</span>
        </el-form-item>
      </el-form>
      <slot v-else />
    </el-config-provider>
  </el-card>
</template>

<script setup lang="ts">
/**
 * 查询卡片容器。
 * 职责：根据字段配置渲染查询表单，并向外透出 reset / submit / 列数调整事件。
 * 约束：字段值直接写入外部传入的 model（受控对象），组件本身不维护冗余副本。
 */
import { computed } from 'vue'
import type { CommonCardFieldConfig } from './common-card.types'

// 向父组件发出的交互事件：重置、提交、每行展示列数变化。
const emit = defineEmits<{
  reset: []
  submit: []
  'update:queryColumns': [value: number]
}>()

// 公开配置项：控制标题、网格列数、字段集合与表单标签布局。
const props = withDefaults(
  defineProps<{
    title?: string
    showReset?: boolean
    queryColumns?: number
    showColumnSetting?: boolean
    model?: Record<string, any>
    fields?: CommonCardFieldConfig[]
    formLabelPosition?: 'left' | 'right' | 'top'
  }>(),
  {
    title: '',
    showReset: false,
    queryColumns: 6,
    showColumnSetting: false,
    model: () => ({}),
    fields: () => [],
    formLabelPosition: 'left'
  }
)

// 标准化列数，避免非法值导致布局抖动；最终范围固定在 1~12。
const resolvedQueryColumns = computed(() => {
  const value = Number(props.queryColumns)
  if (!Number.isFinite(value)) return 6
  return Math.min(12, Math.max(1, Math.floor(value)))
})

// 同步列数设置到父层，保持与输入控件的行为一致（下取整并限幅）。
const handleQueryColumnsChange = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return
  emit('update:queryColumns', Math.min(12, Math.max(1, Math.floor(value))))
}

// 通过 CSS 变量驱动网格列数，减少模板内重复样式拼接。
const cardStyleVars = computed(() => {
  const columns = resolvedQueryColumns.value
  return {
    '--query-columns': String(columns)
  }
})

// 仅渲染启用字段，禁用项由配置层过滤而非模板层分支堆叠。
const enabledFields = computed(() => {
  return (props.fields || []).filter((field) => field.enabled !== false)
})

// 表单模型透传：保证外部状态是单一数据源。
const formModel = computed(() => props.model || {})

// 读取字段值时统一走模型访问，便于后续做字段级拦截或转换。
const getFieldValue = (fieldKey: string) => {
  return formModel.value[fieldKey]
}

// 更新字段值采用就地写入，确保与外层响应式对象保持引用一致。
const setFieldValue = (fieldKey: string, value: unknown) => {
  formModel.value[fieldKey] = value
}

// 标签回退策略：优先显式 label，其次尝试从 placeholder 推导可读名称。
const resolveFieldLabel = (field: CommonCardFieldConfig) => {
  if (field.label) {
    return field.label
  }
  if (!field.placeholder) {
    return ''
  }
  return field.placeholder.replace(/^请输入/, '')
}
</script>

<style>
.common-query-card {
  flex-shrink: 0;
  --el-card-padding: 12px;
}

.common-query-card__header {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.common-query-card__header-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 22px;
}

.common-query-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.common-query-card__column-setting {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.common-query-card__column-setting-label {
  font-size: 12px;
  color: #606266;
  line-height: 1;
  white-space: nowrap;
}

:v-deep(.common-query-card__column-setting .el-input-number) {
  width: 58px;
}

:v-deep(.common-query-card__header-wrap .el-button) {
  height: 18px;
  min-height: 18px;
  padding: 0 8px !important;
  font-size: 12px !important;
  line-height: 18px;
}

:v-deep(.common-query-card.el-card .el-card__header) {
  padding: 0 12px !important;
  min-height: 22px;
}

:v-deep(.common-query-card .el-card__body) {
  padding: 8px 12px;
  overflow-x: auto;
}

:v-deep(.common-query-card .el-card__body > *) {
  min-width: max-content;
}

:v-deep(.common-query-card .el-card__body > .query-form) {
  min-width: 0;
}

:v-deep(.common-query-card .query-form-grid) {
  display: grid !important;
  grid-template-columns: repeat(var(--query-columns, 6), minmax(0, 1fr)) !important;
  gap: 8px 12px;
  width: 100%;
  min-width: 0 !important;
}

:v-deep(.common-query-card .query-form-grid > *) {
  width: auto;
  max-width: none;
  min-width: 0;
}

:v-deep(.common-query-card .query-form-grid .el-form-item) {
  margin-bottom: 0;
  min-width: 0;
  width: 100%;
}
</style>