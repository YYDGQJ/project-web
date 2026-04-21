import { get, getErrorMessage } from '../../../common/request'

/**
 * 菜单模板节点定义。
 * 同时作为前端渲染结构与本地缓存结构的统一类型。
 */
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

export let defaultMenuRouteTemplates: MenuRouteItem[] = [
  {
    path: '/mm',
    name: 'MMRoot',
    label: '生产管理',
    component: 'Home',
    enabled: true,
    description: '生产管理模块菜单',
    category: '模块',
    order: 1,
    children: [
      {
        path: '/mm/mm00',
        name: 'Mm00View',
        label: '生产总览',
        component: 'Mm00View',
        enabled: true,
        description: '生产管理首页',
        category: '生产管理',
        order: 1
      },
      {
        path: '/mm/mmbs',
        name: 'MmbsView',
        label: '班次计划',
        component: 'MmbsView',
        enabled: true,
        description: '班次计划维护',
        category: '生产管理',
        order: 2
      },
      {
        path: '/mm/mmbw',
        name: 'MmbwView',
        label: '工位看板',
        component: 'MmbwView',
        enabled: true,
        description: '工位执行看板',
        category: '生产管理',
        order: 3
      },
      {
        path: '/mm/mmhr',
        name: 'MmhrView',
        label: '人员排班',
        component: 'MmhrView',
        enabled: true,
        description: '人员排班配置',
        category: '生产管理',
        order: 4
      },
      {
        path: '/mm/mmsm',
        name: 'MmsmView',
        label: '生产汇总',
        component: 'MmsmView',
        enabled: true,
        description: '生产数据汇总',
        category: '生产管理',
        order: 5
      }
    ]
  },
  {
    path: '/om',
    name: 'OMRoot',
    label: '订单管理',
    component: 'Home',
    enabled: true,
    description: '订单管理模块菜单',
    category: '模块',
    order: 2,
    children: [
      {
        path: '/om/pmoa',
        name: 'PmoaView',
        label: '订单受理',
        component: 'PmoaView',
        enabled: true,
        description: '订单受理页面',
        category: '订单管理',
        order: 1
      },
      {
        path: '/om/pmof',
        name: 'PmofView',
        label: '订单分发',
        component: 'PmofView',
        enabled: true,
        description: '订单分发页面',
        category: '订单管理',
        order: 2
      },
      {
        path: '/om/pmog',
        name: 'PmogView',
        label: '订单跟踪',
        component: 'PmogView',
        enabled: true,
        description: '订单跟踪页面',
        category: '订单管理',
        order: 3
      },
      {
        path: '/om/pmol',
        name: 'PmolView',
        label: '物流协同',
        component: 'PmolView',
        enabled: true,
        description: '物流协同页面',
        category: '订单管理',
        order: 4
      },
      {
        path: '/om/pmom',
        name: 'PmomView',
        label: '订单监控',
        component: 'PmomView',
        enabled: true,
        description: '订单监控页面',
        category: '订单管理',
        order: 5
      },
      {
        path: '/om/pmop',
        name: 'PmopView',
        label: '订单打印',
        component: 'PmopView',
        enabled: true,
        description: '订单打印页面',
        category: '订单管理',
        order: 6
      }
    ]
  },
  {
    path: '/ps',
    name: 'PSRoot',
    label: '计划排程',
    component: 'Home',
    enabled: true,
    description: '计划排程模块菜单',
    category: '模块',
    order: 3,
    children: [
      {
        path: '/ps/pabs',
        name: 'PabsView',
        label: '资源基准',
        component: 'PabsView',
        enabled: true,
        description: '资源基准维护',
        category: '计划排程',
        order: 1
      },
      {
        path: '/ps/psbw',
        name: 'PsbwView',
        label: '计划看板',
        component: 'PsbwView',
        enabled: true,
        description: '计划看板页面',
        category: '计划排程',
        order: 2
      },
      {
        path: '/ps/pshr',
        name: 'PshrView',
        label: '排程规则',
        component: 'PshrView',
        enabled: true,
        description: '排程规则维护',
        category: '计划排程',
        order: 3
      },
      {
        path: '/ps/pssm',
        name: 'PssmView',
        label: '排程模拟',
        component: 'PssmView',
        enabled: true,
        description: '排程模拟页面',
        category: '计划排程',
        order: 4
      }
    ]
  },
  {
    path: '/security',
    name: 'SecurityRoot',
    label: '系统管理',
    component: 'Home',
    enabled: true,
    description: '系统管理模块菜单',
    category: '模块',
    order: 4,
    children: [
      {
        path: '/security/userManage',
        name: 'UserManage',
        label: '用户管理',
        component: 'UserManage',
        enabled: true,
        description: '用户与角色维护',
        category: '系统管理',
        order: 1
      },
      {
        path: '/security/manuSettings',
        name: 'MenuSettings',
        label: '菜单管理',
        component: 'MenuSettings',
        enabled: true,
        description: '菜单模板与顺序维护',
        category: '系统管理',
        order: 2
      }
    ]
  },
  {
    path: '/test',
    name: 'TestRoot',
    label: '测试页面',
    component: 'Home',
    enabled: true,
    description: '测试与示例页面菜单',
    category: '模块',
    order: 5,
    children: [
      {
        path: '/test/page/sample',
        name: 'TestPageSample',
        label: '页面示例',
        component: 'TestPageSample',
        enabled: true,
        description: '基础页面示例',
        category: '测试页面',
        order: 1
      },
      {
        path: '/test/table/commonTableFeatureDemo',
        name: 'CommonTableFeatureDemo',
        label: '表格能力测试',
        component: 'CommonTableFeatureDemo',
        enabled: true,
        description: '通用表格综合能力测试',
        category: '测试页面',
        order: 2
      },
      {
        path: '/test/table/rowDragFlatTest',
        name: 'RowDragFlatTest',
        label: '平铺拖拽测试',
        component: 'RowDragFlatTest',
        enabled: true,
        description: '平铺表格拖拽测试',
        category: '测试页面',
        order: 3
      },
      {
        path: '/test/table/rowDragTreeTest',
        name: 'RowDragTreeTest',
        label: '树形拖拽测试',
        component: 'RowDragTreeTest',
        enabled: true,
        description: '树形表格拖拽测试',
        category: '测试页面',
        order: 4
      }
    ]
  }
]

// 按 order 递归排序，未设置 order 的节点默认排到末尾。
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

// 抽取 path -> order 映射，便于将本地顺序合并回最新默认模板。
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

const isMenuRouteItemArray = (value: unknown): value is MenuRouteItem[] => {
  return Array.isArray(value)
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

// 本地缓存只保留顺序信息，菜单实体始终以最新默认模板为准。
const loadStoredMenuRouteTemplates = (): MenuRouteItem[] => {
  if (typeof window === 'undefined') {
    return sortMenuRouteTemplates(defaultMenuRouteTemplates)
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const storedTemplates = JSON.parse(stored) as unknown
      if (!isMenuRouteItemArray(storedTemplates)) {
        console.warn('本地菜单模板缓存结构无效，忽略该缓存并回退默认模板')
        return sortMenuRouteTemplates(defaultMenuRouteTemplates)
      }
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

// 兼容后端多种包装结构（data/list/items/result 等）。
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

// 将未知结构节点收敛为 MenuRouteItem，不满足关键字段时直接丢弃。
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

// 拉取远端菜单模板，失败时回退本地默认模板。
const fetchDefaultMenuRouteTemplates = async (): Promise<MenuRouteItem[] | null> => {
  try {
    const result = await get<unknown>(MENU_ROUTE_TEMPLATE_URL)
    const normalized = normalizeMenuRouteItems(result)

    if (!normalized.length) {
      console.warn('后台菜单接口已返回结果，但结构不是有效菜单模板，使用本地默认模板', result)
      return null
    }

    return normalized
  } catch (error) {
    console.warn(`加载后台菜单模板失败，使用本地默认模板：${getErrorMessage(error)}`, error)
    return null
  }
}

export let menuRouteTemplates: MenuRouteItem[] = loadStoredMenuRouteTemplates()

// 仅展开可见且最终可点击的菜单叶子节点。
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

