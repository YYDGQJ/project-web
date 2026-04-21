import { post } from '../../common/request'

const USER_INFO_KEY = 'currentUserInfo'
const LOCAL_STORAGE_PREFIX = 'commonTablePreference'

const env = import.meta.env as Record<string, string | undefined>
const TABLE_PREFERENCE_LOAD_URL =
  env.VITE_TABLE_PREFERENCE_LOAD_URL ??
  env.TABLE_PREFERENCE_LOAD_URL ??
  '/tableConfig/load'
const TABLE_PREFERENCE_SAVE_URL =
  env.VITE_TABLE_PREFERENCE_SAVE_URL ??
  env.TABLE_PREFERENCE_SAVE_URL ??
  '/tableConfig/save'

export interface CommonTablePreference {
  visibleColumnKeys: string[]
  columnOrderKeys: string[]
  resizedColumnWidths: Record<string, number>
  pageSize: number
}

interface CurrentUserIdentity {
  userId: string
}

const normalizeUserId = (raw: unknown): string | null => {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Record<string, unknown>
  const candidate = source.userId ?? source.user_id ?? source.userid ?? source.id ?? source.userName ?? source.username
  if (candidate === undefined || candidate === null) {
    return null
  }

  const text = String(candidate).trim()
  return text || null
}

const getCurrentUserIdentity = (): CurrentUserIdentity | null => {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    const userId = normalizeUserId(parsed)
    if (!userId) {
      return null
    }
    return { userId }
  } catch {
    return null
  }
}

const getLocalStorageKey = (userId: string, routePath: string, key: string) => {
  return `${LOCAL_STORAGE_PREFIX}:${userId}:${routePath}:${key}`
}

const normalizeWidthMap = (raw: unknown): Record<string, number> => {
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const source = raw as Record<string, unknown>
  const normalized: Record<string, number> = {}
  Object.entries(source).forEach(([key, value]) => {
    const width = Number(value)
    if (Number.isFinite(width) && width > 0) {
      normalized[key] = width
    }
  })
  return normalized
}

const normalizeStringArray = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map((item) => String(item)).filter(Boolean)
}

const normalizePreference = (raw: unknown): CommonTablePreference | null => {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Record<string, unknown>
  const hasPreferenceFields =
    'visibleColumnKeys' in source ||
    'columnOrderKeys' in source ||
    'resizedColumnWidths' in source ||
    'pageSize' in source

  // 后端未配置时常返回业务壳对象，避免将其误判为“空偏好”。
  if (!hasPreferenceFields) {
    return null
  }

  const pageSize = Number(source.pageSize)

  return {
    visibleColumnKeys: normalizeStringArray(source.visibleColumnKeys),
    columnOrderKeys: normalizeStringArray(source.columnOrderKeys),
    resizedColumnWidths: normalizeWidthMap(source.resizedColumnWidths),
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 100
  }
}

const unwrapPreferenceResponse = (raw: unknown): CommonTablePreference | null => {
  const direct = normalizePreference(raw)
  if (direct) {
    return direct
  }

  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Record<string, unknown>
  return (
    normalizePreference(source.data) ||
    normalizePreference(source.config) ||
    (source.data && typeof source.data === 'object'
      ? normalizePreference((source.data as Record<string, unknown>).config)
      : null)
  )
}

const writeLocalPreference = (userId: string, routePath: string, key: string, preference: CommonTablePreference) => {
  try {
    localStorage.setItem(
      getLocalStorageKey(userId, routePath, key),
      JSON.stringify(preference)
    )
  } catch {
    // 忽略本地写入异常，不影响页面交互
  }
}

const readLocalPreference = (userId: string, routePath: string, key: string): CommonTablePreference | null => {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(userId, routePath, key))
    if (!raw) {
      return null
    }
    return normalizePreference(JSON.parse(raw))
  } catch {
    return null
  }
}

export const loadCommonTablePreference = async (routePath: string, key: string): Promise<CommonTablePreference | null> => {
  const identity = getCurrentUserIdentity()
  if (!identity) {
    return null
  }

  try {
    const response = await post<unknown>(TABLE_PREFERENCE_LOAD_URL, {
      userId: identity.userId,
      routePath,
      key
    })
    const preference = unwrapPreferenceResponse(response)
    if (preference) {
      writeLocalPreference(identity.userId, routePath, key, preference)
      return preference
    }
  } catch {
    // 远端失败时降级读取本地缓存
  }

  return readLocalPreference(identity.userId, routePath, key)
}

export const saveCommonTablePreference = async (
  routePath: string,
  key: string,
  preference: CommonTablePreference
): Promise<void> => {
  const identity = getCurrentUserIdentity()
  if (!identity) {
    return
  }

  writeLocalPreference(identity.userId, routePath, key, preference)

  try {
    await post(TABLE_PREFERENCE_SAVE_URL, {
      userId: identity.userId,
      routePath,
      key: key,
      config: preference
    })
  } catch {
    // 远端写入失败时保持静默，避免打断用户操作
  }
}
