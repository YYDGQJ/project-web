import { get } from '../../../common/request'

export interface MenuRouteItem {
  path: string
  name: string
  label: string
  component: string
  enabled: boolean
  description: string
  category?: string
  order?: number
  children?: MenuRouteItem[]
}

const STORAGE_KEY = 'menuRouteTemplates'
const MENU_ROUTE_TEMPLATE_URL = import.meta.env.API_MENU_ROUTE_TEMPLATE_URL || '/menu/query'

export let defaultMenuRouteTemplates: MenuRouteItem[] = []

const sortMenuRouteTemplates = (items: MenuRouteItem[]): MenuRouteItem[] => {
  return items
    .slice()
    .sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
      return aOrder - bOrder
    })
    .map((item) => ({
      ...item,
      children: item.children ? sortMenuRouteTemplates(item.children) : undefined
    }))
}

const buildOrderMap = (items: MenuRouteItem[], map = new Map<string, number>()): Map<string, number> => {
  items.forEach((item) => {
    if (item.order !== undefined) {
      map.set(item.path, item.order)
    }
    if (item.children) {
      buildOrderMap(item.children, map)
    }
  })
  return map
}

const mergeMenuRouteTemplates = (
  defaults: MenuRouteItem[],
  storedOrderMap: Map<string, number>
): MenuRouteItem[] => {
  return defaults.map((item) => ({
    ...item,
    order: storedOrderMap.get(item.path) ?? item.order,
    children: item.children
      ? mergeMenuRouteTemplates(item.children, storedOrderMap)
      : undefined
  }))
}

const loadStoredMenuRouteTemplates = (): MenuRouteItem[] => {
  if (typeof window === 'undefined') {
    return sortMenuRouteTemplates(defaultMenuRouteTemplates)
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const storedTemplates = JSON.parse(stored) as MenuRouteItem[]
      const storedOrderMap = buildOrderMap(storedTemplates)
      return sortMenuRouteTemplates(
        mergeMenuRouteTemplates(defaultMenuRouteTemplates, storedOrderMap)
      )
    }
  } catch (error) {
    console.warn('加载本地菜单顺序失败', error)
  }

  return sortMenuRouteTemplates(defaultMenuRouteTemplates)
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const normalizeMenuRouteItems = (
  payload: unknown,
  inheritedCategory?: string
): MenuRouteItem[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeMenuRouteItem(item, inheritedCategory))
      .filter((item): item is MenuRouteItem => !!item)
  }

  if (!isObject(payload)) {
    return []
  }

  const candidateKeys = ['data', 'list', 'records', 'rows', 'items', 'result']
  for (const key of candidateKeys) {
    if (key in payload) {
      const normalized = normalizeMenuRouteItems(payload[key], inheritedCategory)
      if (normalized.length) {
        return normalized
      }
    }
  }

  const single = normalizeMenuRouteItem(payload, inheritedCategory)
  return single ? [single] : []
}

const normalizeMenuRouteItem = (
  payload: unknown,
  inheritedCategory?: string
): MenuRouteItem | null => {
  if (!isObject(payload)) {
    return null
  }

  const path = typeof payload.path === 'string' ? payload.path.trim() : ''
  const label = typeof payload.label === 'string' ? payload.label.trim() : ''
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const component = typeof payload.component === 'string' ? payload.component.trim() : ''

  if (!path || !label || !name || !component) {
    return null
  }

  const currentCategory =
    typeof payload.category === 'string' && payload.category.trim()
      ? payload.category.trim()
      : inheritedCategory

  const order = typeof payload.order === 'number' ? payload.order : undefined
  const enabled = typeof payload.enabled === 'boolean' ? payload.enabled : true
  const description =
    typeof payload.description === 'string' && payload.description.trim()
      ? payload.description.trim()
      : label

  const children = normalizeMenuRouteItems(payload.children, currentCategory)

  return {
    path,
    label,
    name,
    component,
    enabled,
    description,
    category: currentCategory,
    order,
    children: children.length ? children : undefined
  }
}

const fetchDefaultMenuRouteTemplates = async (): Promise<MenuRouteItem[] | null> => {
  try {
    const result = await get<unknown>(MENU_ROUTE_TEMPLATE_URL)
    const normalized = normalizeMenuRouteItems(result)

    if (!normalized.length) {
      console.warn('后台菜单模板为空，使用本地默认模板')
      return null
    }

    return normalized
  } catch (error) {
    console.warn('加载后台菜单模板失败，使用本地默认模板', error)
    return null
  }
}

export let menuRouteTemplates: MenuRouteItem[] = loadStoredMenuRouteTemplates()

const flatten = (
  items: MenuRouteItem[],
  parentEnabled = true
): MenuRouteItem[] => {
  return items.reduce<MenuRouteItem[]>((acc, item) => {
    const isEnabled = parentEnabled && item.enabled
    if (!isEnabled) {
      return acc
    }

    if (item.children && item.children.length) {
      acc.push(...flatten(item.children, isEnabled))
      return acc
    }

    const { children, ...rest } = item
    acc.push(rest as MenuRouteItem)
    return acc
  }, [])
}

export let visibleMenuRouteTemplates: MenuRouteItem[] = flatten(menuRouteTemplates)

const refreshMenuRouteTemplates = () => {
  menuRouteTemplates = loadStoredMenuRouteTemplates()
  visibleMenuRouteTemplates = flatten(menuRouteTemplates)
}

let initialized = false
let initializingPromise: Promise<void> | null = null

export const initializeMenuRouteTemplates = async (): Promise<void> => {
  if (initialized) {
    return
  }

  if (initializingPromise) {
    return initializingPromise
  }

  initializingPromise = (async () => {
    const remoteTemplates = await fetchDefaultMenuRouteTemplates()
    if (remoteTemplates?.length) {
      defaultMenuRouteTemplates = remoteTemplates
    }
    refreshMenuRouteTemplates()
    initialized = true
  })().finally(() => {
    initializingPromise = null
  })

  return initializingPromise
}

