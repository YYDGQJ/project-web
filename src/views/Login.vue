<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <div class="login-title">登录</div>
      <el-form :model="form" class="login-form" @submit.prevent="submitLogin">
        <el-form-item label="用户名" label-width="80px">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" label-width="80px">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitLogin" style="width: 100%;">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { post } from '../common/request'

interface LoginResponse {
  doFlag: number
  msg: string
  data: unknown
}

const router = useRouter()
const form = reactive({
  username: '',
  password: ''
})

const loading = reactive({
  submitting: false
})

const submitLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  if (loading.submitting) {
    return
  }

  loading.submitting = true

  try {
    const result = await post<LoginResponse>('/user/login', {
      userId: form.username,
      passWord: form.password
    })

    if (result.doFlag === 0) {
      localStorage.setItem('loggedIn', 'true')
      localStorage.setItem('lastActive', Date.now().toString())
      ElMessage.success({
        message: result.msg || '登录成功',
        duration: 3000
      })
      window.setTimeout(() => {
        router.push('/home')
      }, 3000)
      return
    }

    localStorage.setItem('loggedIn', 'false')
    localStorage.removeItem('lastActive')
    ElMessage.error(result.msg || '登录失败')
  } catch (error) {
    ElMessage.error('无法连接后台服务，请检查接口地址')
  } finally {
    loading.submitting = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 24px;
}
.login-card {
  width: 380px;
  max-width: 100%;
}
.login-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
}
.login-form {
  width: 100%;
}
</style>
