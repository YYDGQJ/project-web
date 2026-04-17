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

export const defaultMenuRouteTemplates: MenuRouteItem[] = [
  {
    label: '物料管理',
    path: '/mm',
    name: 'MM',
    component: 'Home',
    enabled: true,
    description: '物料管理目录',
    category: '物料管理',
    order: 1,
    children: [
      {
        label: '物料公共',
        path: '/mm/mm00',
        name: 'MM00',
        component: 'Mm00View',
        enabled: true,
        description: '物料公共页面',
        category: '物料管理',
        order: 1
      },
      {
        label: '轨梁物料管理',
        path: '/mm/mmbs',
        name: 'MMBS',
        component: 'MmbsView',
        enabled: true,
        description: '轨梁物料管理页面',
        category: '物料管理',
        order: 2
      },
      {
        label: '棒线物料管理',
        path: '/mm/mmbw',
        name: 'MMBW',
        component: 'MmbwView',
        enabled: true,
        description: '棒线物料管理页面',
        category: '物料管理',
        order: 3
      },
      {
        label: '中宽带物料管理',
        path: '/mm/mmhr',
        name: 'MMHR',
        component: 'MmhrView',
        enabled: true,
        description: '中宽带物料管理页面',
        category: '物料管理',
        order: 4
      },
      {
        label: '炼钢物料管理',
        path: '/mm/mmsm',
        name: 'MMSM',
        component: 'MmsmView',
        enabled: true,
        description: '炼钢物料管理页面',
        category: '物料管理',
        order: 5
      }
    ]
  },
  {
    label: '合同管理',
    path: '/om',
    name: 'OM',
    component: 'Home',
    enabled: true,
    description: '合同管理目录',
    category: '合同管理',
    order: 2,
    children: [
      {
        label: '转用充当',
        path: '/om/pmoa',
        name: 'PMOA',
        component: 'PmoaView',
        enabled: true,
        description: '转用充当页面',
        category: '合同管理',
        order: 1
      },
      {
        label: '合同跟踪',
        path: '/om/pmof',
        name: 'PMOF',
        component: 'PmofView',
        enabled: true,
        description: '合同跟踪页面',
        category: '合同管理',
        order: 2
      },
      {
        label: '合同归并',
        path: '/om/pmog',
        name: 'PMOG',
        component: 'PmogView',
        enabled: true,
        description: '合同归并页面',
        category: '合同管理',
        order: 3
      },
      {
        label: '合同准发',
        path: '/om/pmol',
        name: 'PMOL',
        component: 'PmolView',
        enabled: true,
        description: '合同准发页面',
        category: '合同管理',
        order: 4
      },
      {
        label: '材料申请',
        path: '/om/pmom',
        name: 'PMOM',
        component: 'PmomView',
        enabled: true,
        description: '材料申请页面',
        category: '合同管理',
        order: 5
      },
      {
        label: '合同计划',
        path: '/om/pmop',
        name: 'PMOP',
        component: 'PmopView',
        enabled: true,
        description: '合同计划页面',
        category: '合同管理',
        order: 6
      }
    ]
  },
  {
    label: '计划管理',
    path: '/ps',
    name: 'PS',
    component: 'Home',
    enabled: true,
    description: '计划管理目录',
    category: '计划管理',
    order: 3,
    children: [
      {
        label: '轨梁计划',
        path: '/ps/pabs',
        name: 'PABS',
        component: 'PabsView',
        enabled: true,
        description: '轨梁计划页面',
        category: '计划管理',
        order: 1
      },
      {
        label: '棒线计划',
        path: '/ps/psbw',
        name: 'PSBW',
        component: 'PsbwView',
        enabled: true,
        description: '棒线计划页面',
        category: '计划管理',
        order: 2
      },
      {
        label: '中宽带计划',
        path: '/ps/pshr',
        name: 'PSHR',
        component: 'PshrView',
        enabled: true,
        description: '中宽带计划页面',
        category: '计划管理',
        order: 3
      },
      {
        label: '炼钢计划',
        path: '/ps/pssm',
        name: 'PSSM',
        component: 'PssmView',
        enabled: true,
        description: '炼钢计划页面',
        category: '计划管理',
        order: 4
      }
    ]
  },
  {
    label: '安全配置',
    path: '/security',
    name: 'Security',
    component: 'Home',
    enabled: true,
    description: '安全配置目录',
    category: '安全配置',
    order: 4,
    children: [
      {
        label: '菜单管理',
        path: '/security/menuSettings',
        name: 'MenuSettings',
        component: 'MenuSettings',
        enabled: true,
        description: '菜单管理页面',
        category: '安全配置',
        order: 1
      }
    ]
  }
]

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

export const menuRouteTemplates: MenuRouteItem[] = loadStoredMenuRouteTemplates()

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

const flatMenuRouteTemplates: MenuRouteItem[] = flatten(menuRouteTemplates)
export const visibleMenuRouteTemplates: MenuRouteItem[] = flatMenuRouteTemplates

