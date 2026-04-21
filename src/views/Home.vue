<template>
  <el-card shadow="hover">
    <div class="card-header">
      <h2>欢迎使用 Element Plus</h2>
      <el-button type="primary" @click="toggleVisible">
        {{ visible ? '隐藏内容' : '显示内容' }}
      </el-button>
    </div>

    <el-form :model="form" label-width="90px" class="demo-form">
      <el-form-item label="姓名">
        <el-input v-model="form.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="年龄">
        <el-input-number v-model="form.age" :min="1" :max="120" />
      </el-form-item>
      <el-form-item label="性别">
        <el-select v-model="form.gender" placeholder="请选择性别">
          <el-option label="男" value="男" />
          <el-option label="女" value="女" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-divider />

    <div v-if="visible">
      <el-alert title="这是显示内容" type="success" show-icon />
      <CommonTable
        :data="tableData"
        :columns="tableColumns"
        :row-draggable="true"
        order-field="order"
        table-style="width: 100%; margin-top: 20px;"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
// 组件说明：Home 组件，负责当前页面的结构与交互。
import { reactive, ref } from 'vue'
import CommonTable, { type CommonTableColumn } from '../components/table/CommonTable.vue'

const visible = ref(true)
const form = reactive({
  name: '',
  age: 25,
  gender: ''
})

const tableData = ref([
  { order: 1, date: '2026-04-13', name: '张三', address: '上海市普陀区' },
  { order: 2, date: '2026-04-14', name: '李四', address: '北京市朝阳区' },
  { order: 3, date: '2026-04-15', name: '王五', address: '广州市天河区' }
])

const tableColumns: CommonTableColumn[] = [
  { prop: 'order', label: '顺序', width: 100 },
  { prop: 'date', label: '日期', width: 150 },
  { prop: 'name', label: '姓名', width: 180 },
  { prop: 'address', label: '地址' }
]

const toggleVisible = () => {
  visible.value = !visible.value
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.demo-form {
  max-width: 520px;
}
</style>
