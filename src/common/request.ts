import axios, { AxiosRequestConfig } from 'axios'

const apiHost = import.meta.env.API_HOST || 'http://localhost:3080/api'

const request = axios.create({
  baseURL: apiHost,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

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