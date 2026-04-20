<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <div class="login-title">登录</div>
      <el-form :model="form" class="login-form" @submit.prevent="submitLogin">
        <el-form-item label="用户名" label-width="80px">
          <el-input v-model="form.username" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码" label-width="80px">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" style="width: 100%;">
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
  data?: unknown
  [key: string]: unknown
}

interface UserInfo {
  id?: number
  userId?: string
  userName?: string
  userPhone?: string
  dept?: string
  position?: string
  status?: number | string
  role?: string
}

const USER_INFO_KEY = 'currentUserInfo'

const toUserInfo = (raw: unknown): UserInfo | null => {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Record<string, unknown>
  const userId = (source.userId ?? source.user_id ?? source.userid) as string | undefined
  const userName = (source.userName ?? source.user_name ?? source.username) as string | undefined
  const userPhone = (source.userPhone ?? source.user_phone ?? source.phone) as string | undefined
  const dept = (source.dept ?? source.department) as string | undefined
  const position = (source.position ?? source.post) as string | undefined
  const role = (source.role ?? source.roleName ?? source.role_name) as string | undefined
  const status = source.status as number | string | undefined
  const id = source.id as number | undefined

  if (!userId && !userName && !userPhone && !dept && !position && !role && status === undefined && id === undefined) {
    return null
  }

  return {
    id,
    userId,
    userName,
    userPhone,
    dept,
    position,
    status,
    role
  }
}

const extractUserInfo = (result: LoginResponse): UserInfo | null => {
  const topLevel = toUserInfo(result)
  if (topLevel) {
    return topLevel
  }

  const data = result.data
  const direct = toUserInfo(data)
  if (direct) {
    return direct
  }

  if (Array.isArray(data) && data.length > 0) {
    const fromArray = toUserInfo(data[0])
    if (fromArray) {
      return fromArray
    }
  }

  if (data && typeof data === 'object') {
    const dataObj = data as Record<string, unknown>
    const fromNested = toUserInfo(dataObj.userInfo) || toUserInfo(dataObj.user) || toUserInfo(dataObj.data)
    if (fromNested) {
      return fromNested
    }
  }

  return null
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
    ElMessage.warning('请输入账号和密码')
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
      const userInfo = extractUserInfo(result) || {
        userId: form.username,
        userName: form.username
      }
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
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
    localStorage.removeItem(USER_INFO_KEY)
    ElMessage.error(result.msg || '登录失败')
  } catch (error) {
    localStorage.removeItem(USER_INFO_KEY)
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
