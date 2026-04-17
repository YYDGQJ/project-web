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
      <el-table :data="tableData" style="width: 100%; margin-top: 20px;">
        <el-table-column prop="date" label="日期" width="150" />
        <el-table-column prop="name" label="姓名" width="180" />
        <el-table-column prop="address" label="地址" />
      </el-table>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const visible = ref(true)
const form = reactive({
  name: '',
  age: 25,
  gender: ''
})

const tableData = [
  { date: '2026-04-13', name: '张三', address: '上海市普陀区' },
  { date: '2026-04-14', name: '李四', address: '北京市朝阳区' },
  { date: '2026-04-15', name: '王五', address: '广州市天河区' }
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
