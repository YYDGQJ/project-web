<template>
  <div class="user-manage-page">
    <CommonQueryCard
      :model="query"
      :fields="queryFields"
      title="查询条件"
      :show-reset="true"
      @submit="handleSearchSubmit"
      @reset="resetQuery"
    />

    <!-- 数据表格 -->
    <div class="table-wrap">
      <CommonTable
        ref="commonTableRef"
        :data="tableData"
        :columns="tableColumns"
        :loading="loading.querying"
        :total="total"
        @pagination-change="handlePaginationChange"
        border
        stripe
        name="用户列表"
        table-style="width: 100%; height: 100%;"
      />
    </div>

    <div class="query-action-bar">
      <div class="query-action-wrap">
        <el-button size="default" type="primary" :loading="loading.querying" @click="handleSearchSubmit">查询</el-button>
      </div>
    </div>
  </div>

  <!-- 新增用户弹窗 -->
  <el-dialog v-model="dialogVisible" title="新增用户" width="480px" :close-on-click-modal="false">
    <el-form :model="form" label-width="90px" @submit.prevent="submitUser">
      <el-form-item label="工号" required>
        <el-input v-model="form.userId" placeholder="请输入工号" />
      </el-form-item>
      <el-form-item label="用户名称" required>
        <el-input v-model="form.userName" placeholder="请输入用户名称" />
      </el-form-item>
      <el-form-item label="手机号" required>
        <el-input v-model="form.userPhone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="用户状态">
        <el-select v-model="form.status" style="width: 100%;">
          <el-option label="启用" value="1" />
          <el-option label="停用" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item label="部门" required>
        <el-input v-model="form.dept" placeholder="请输入部门" />
      </el-form-item>
      <el-form-item label="岗位" required>
        <el-input v-model="form.position" placeholder="请输入岗位" />
      </el-form-item>
      <el-form-item label="角色" required>
        <el-input v-model="form.role" placeholder="请输入角色" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="loading.submitting" @click="submitUser">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { post } from '../../../common/request'
import CommonTable, { type CommonTableColumn } from '../../../components/CommonTable.vue'
import CommonQueryCard from '../../../components/CommonQueryCard.vue'
import type { CommonCardFieldConfig } from '../../../components/common-card.types'

interface UserItem {
  id: number
  userId: string
  userName: string
  userPhone: string
  status: string
  dept: string
  position: string
  role: string
}


interface ApiResponse<T> {
  doFlag: number
  msg: string
  data: T
}

interface PageResponse<T> {
  records?: T[]
  total?: number
  current?: number
  size?: number
}

// 查询表单字段配置
const queryFields: CommonCardFieldConfig[] = [
  { type: 'input', model: 'userId', label: '工号', placeholder: '请输入工号', enabled: true },
  { type: 'input', model: 'userName', label: '用户名称', placeholder: '请输入用户名称', enabled: true },
  { type: 'input', model: 'userPhone', label: '手机号', placeholder: '请输入手机号', enabled: true },
  { type: 'input', model: 'dept', label: '部门', placeholder: '请输入部门', enabled: true },
  { type: 'input', model: 'position', label: '岗位', placeholder: '请输入岗位', enabled: true },
  { type: 'input', model: 'role', label: '角色', placeholder: '请输入角色', enabled: true },
  { type: 'textarea', model: 'flexKeyword', label: '可变尺寸', placeholder: '拖拽右下角可调整宽高', enabled: true, rows: 1 }
]

const query = reactive({ userId: '', userName: '', userPhone: '', dept: '', position: '', role: '', flexKeyword: '' })
const form = reactive({ userId: '', userName: '', userPhone: '', status: '1', dept: '', position: '', role: '' })
const loading = reactive({ querying: false, submitting: false })
const tableData = ref<UserItem[]>([])
const dialogVisible = ref(false)
const commonTableRef = ref<{ resetPagination: () => void } | null>(null)
const requestPageState = reactive({ currentPage: 1, pageSize: 100 })
const serverTotal = ref(0)
const total = computed(() => Math.max(serverTotal.value, tableData.value.length))
const tableColumns: CommonTableColumn[] = [
  { prop: 'userId', label: '工号' },
  { prop: 'userName', label: '用户名称' },
  { prop: 'userPhone', label: '手机号' },
  { prop: 'dept', label: '部门' },
  { prop: 'position', label: '岗位' },
  { prop: 'role', label: '角色' }
]

// ================= 工具函数 =================
/**
 * 判断对象是否为 UserItem 类型
 */
const isUserItem = (value: unknown): value is UserItem => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const source = value as Record<string, unknown>
  return 'userId' in source || 'userName' in source || 'userPhone' in source
}

/**
 * 规范化后端返回的用户列表数据，兼容多种结构
 */
const normalizeUserList = (payload: unknown): UserItem[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isUserItem)
  }
  if (!payload || typeof payload !== 'object') {
    return []
  }
  const source = payload as Record<string, unknown>
  const candidateKeys = ['list', 'records', 'rows', 'items', 'result', 'data']
  for (const key of candidateKeys) {
    const candidate = source[key]
    if (Array.isArray(candidate)) {
      return candidate.filter(isUserItem)
    }
  }
  if (isUserItem(source)) {
    return [source]
  }
  return []
}

/**
 * 判断对象是否为分页响应结构
 */
const isPageResponse = <T,>(payload: unknown): payload is PageResponse<T> => {
  if (!payload || typeof payload !== 'object') {
    return false
  }
  const source = payload as Record<string, unknown>
  return 'records' in source || 'total' in source || 'current' in source || 'size' in source
}

// ================= 数据请求与处理 =================
/**
 * 查询用户数据，支持分页参数
 */
const handleQuery = async (options?: { currentPage?: number; pageSize?: number }) => {
  loading.querying = true
  try {
    // 设置分页参数
    if (typeof options?.currentPage === 'number' && Number.isFinite(options.currentPage) && options.currentPage > 0) {
      requestPageState.currentPage = options.currentPage
    }
    if (typeof options?.pageSize === 'number' && Number.isFinite(options.pageSize) && options.pageSize > 0) {
      requestPageState.pageSize = options.pageSize
    }
    const pageBody = {
      current: requestPageState.currentPage,
      size: requestPageState.pageSize
    }
    // 发起接口请求
    const result = await post<unknown>('/user/query', pageBody, {
      params: { ...query }
    })
    // 兼容分页与非分页结构
    if (isPageResponse<UserItem>(result)) {
      tableData.value = Array.isArray(result.records)
        ? result.records.filter(isUserItem)
        : normalizeUserList(result)
      serverTotal.value = Number(result.total ?? tableData.value.length)
      return
    }
    tableData.value = normalizeUserList(result)
    serverTotal.value = tableData.value.length
  } catch {
    tableData.value = []
    serverTotal.value = 0
    ElMessage.error('用户查询失败，请检查接口或参数')
  } finally {
    loading.querying = false
  }
}

// ================= 交互方法 =================
/**
 * 重置查询条件并重置分页
 */
const resetQuery = () => {
  query.userId = ''
  query.userName = ''
  query.userPhone = ''
  query.dept = ''
  query.position = ''
  query.role = ''
  query.flexKeyword = ''
  commonTableRef.value?.resetPagination()
}

/**
 * 查询按钮点击，重置分页到第一页
 */
const handleSearchSubmit = () => {
  commonTableRef.value?.resetPagination()
}

/**
 * 分页变化时触发，带上新分页参数重新查询
 */
const handlePaginationChange = (payload: { currentPage: number; pageSize: number; reason: 'page' | 'size' | 'reset' }) => {
  handleQuery({
    currentPage: payload.currentPage,
    pageSize: payload.pageSize
  })
}

// ================= 生命周期钩子 =================
/**
 * 页面挂载后自动重置分页并触发首次查询
 */
onMounted(async () => {
  await nextTick()
  commonTableRef.value?.resetPagination()
})


const openAddDialog = () => {
  form.userId = ''
  form.userName = ''
  form.userPhone = ''
  form.status = '1'
  form.dept = ''
  form.position = ''
  form.role = ''
  dialogVisible.value = true
}

const submitUser = async () => {
  if (!form.userId || !form.userName || !form.userPhone || !form.dept || !form.position || !form.role) {
    ElMessage.warning('请完整填写用户信息')
    return
  }
  if (loading.submitting) return
  loading.submitting = true
  try {
    const result = await post<ApiResponse<unknown>>('/user/add', { ...form })
    if (result.doFlag === 0) {
      ElMessage.success(result.msg || '新增用户成功')
      dialogVisible.value = false
      handleQuery()
    } else {
      ElMessage.error(result.msg || '新增用户失败')
    }
  } catch {
    ElMessage.error('无法连接后台服务，请检查接口地址')
  } finally {
    loading.submitting = false
  }
}

onMounted(async () => {
  await nextTick()
  commonTableRef.value?.resetPagination()
})

</script>

<style scoped>
.user-manage-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
}
.query-form {
  margin-bottom: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  white-space: nowrap;
}

:deep(.query-form.el-form--inline .el-form-item) {
  margin-right: 18px;
  margin-bottom: 0;
  flex: 0 0 auto;
}

:deep(.query-form .el-input),
:deep(.query-form .el-select),
:deep(.query-form .el-date-editor) {
  width: 180px;
}

:deep(.query-form .el-input__wrapper),
:deep(.query-form .el-select__wrapper) {
  min-width: 180px;
}

:deep(.query-form.el-form--inline .el-form-item.resizable-form-item .el-form-item__content) {
  position: relative;
  width: 220px;
  min-height: 34px;
}

.resizable-input-wrap {
  position: absolute;
  left: 0;
  top: 0;
  width: 220px;
  min-width: 160px;
  max-width: 420px;
  height: 34px;
  min-height: 34px;
  resize: both;
  overflow: auto;
}

.resizable-input-wrap :deep(.el-textarea),
.resizable-input-wrap :deep(.el-textarea__inner) {
  width: 100%;
  height: 100%;
  min-height: 100% !important;
  box-sizing: border-box;
}

.table-wrap {
  flex: 1;
  min-height: 0;
}

.query-action-bar {
  padding: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.query-action-wrap {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
}

</style>
