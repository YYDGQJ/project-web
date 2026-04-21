import axios, { AxiosError, AxiosRequestConfig } from 'axios'

const apiHost = import.meta.env.API_HOST || 'http://localhost:3080/api'

const request = axios.create({
  baseURL: apiHost,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const pickMessage = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (!isObject(value)) {
    return ''
  }

  const candidateKeys = ['msg', 'message', 'error', 'errMsg', 'detail']
  for (const key of candidateKeys) {
    const message = pickMessage(value[key])
    if (message) {
      return message
    }
  }

  const nestedKeys = ['data', 'result', 'response']
  for (const key of nestedKeys) {
    const message = pickMessage(value[key])
    if (message) {
      return message
    }
  }

  return ''
}

export const getErrorMessage = (error: unknown, fallback = '请求失败，请稍后重试'): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError
    const backendMessage = pickMessage(axiosError.response?.data)
    if (backendMessage) {
      return backendMessage
    }

    if (axiosError.code === 'ECONNABORTED') {
      return '请求超时，请稍后重试'
    }

    if (!axiosError.response) {
      return '无法连接后台服务，请检查接口地址'
    }

    if (typeof axiosError.message === 'string' && axiosError.message.trim()) {
      return axiosError.message.trim()
    }
  }

  const message = pickMessage(error)
  return message || fallback
}

request.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
)

export const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await request.get<T>(url, config)
  return response.data
}

export const post = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await request.post<T>(url, data, config)
  return response.data
}

export default request