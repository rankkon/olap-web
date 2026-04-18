import type { SelectOption } from '../types/filter'
import type { ReportRouteMeta } from '../types/report'

export const SIDEBAR_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/olap', label: 'OLAP Explorer' },
  { to: '/reports', label: 'Reports' },
  { to: '/compare', label: 'Data Validation' },
] as const

export const TIME_OPTIONS: SelectOption[] = [
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
]

export const MEASURE_OPTIONS: SelectOption[] = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Order Count', value: 'orderCount' },
  { label: 'Inventory', value: 'inventory' },
]

export const DIMENSION_OPTIONS: SelectOption[] = [
  { label: 'Time', value: 'time' },
  { label: 'Store', value: 'store' },
  { label: 'Product', value: 'product' },
  { label: 'Customer', value: 'customer' },
]

export const REPORT_ROUTES: ReportRouteMeta[] = [
  {
    id: 1,
    path: '/reports/1',
    shortTitle: 'R01',
    fullTitle: 'Bao cao 01 - Ton kho theo cua hang',
    description: 'Tong hop so luong ton kho theo tung ma cua hang.',
    filterMode: 'none',
  },
  {
    id: 2,
    path: '/reports/2',
    shortTitle: 'R02',
    fullTitle: 'Bao cao 02 - Doanh thu theo quy',
    description: 'Phan tich doanh thu ban hang theo quy cua nam duoc chon.',
    filterMode: 'year',
  },
  {
    id: 3,
    path: '/reports/3',
    shortTitle: 'R03',
    fullTitle: 'Bao cao 03 - Doanh thu theo thang',
    description: 'Drill doanh thu theo tung thang cua nam duoc chon.',
    filterMode: 'year',
  },
  {
    id: 4,
    path: '/reports/4',
    shortTitle: 'R04',
    fullTitle: 'Bao cao 04 - So luong ban theo mat hang',
    description: 'Theo doi mat hang ban ra nhieu nhat theo so luong.',
    filterMode: 'none',
  },
  {
    id: 5,
    path: '/reports/5',
    shortTitle: 'R05',
    fullTitle: 'Bao cao 05 - Doanh thu theo thanh pho khach hang',
    description: 'So sanh doanh thu theo noi sinh song cua khach hang.',
    filterMode: 'none',
  },
  {
    id: 6,
    path: '/reports/6',
    shortTitle: 'R06',
    fullTitle: 'Bao cao 06 - Top khach hang theo doanh thu',
    description: 'Xep hang khach hang dong gop doanh thu cao nhat.',
    filterMode: 'none',
  },
  {
    id: 7,
    path: '/reports/7',
    shortTitle: 'R07',
    fullTitle: 'Bao cao 07 - Ton kho theo bang',
    description: 'Tong hop ton kho theo cap bang cua he thong cua hang.',
    filterMode: 'none',
  },
  {
    id: 8,
    path: '/reports/8',
    shortTitle: 'R08',
    fullTitle: 'Bao cao 08 - Ton kho theo thanh pho',
    description: 'Tong hop ton kho theo thanh pho cua cua hang.',
    filterMode: 'none',
  },
  {
    id: 9,
    path: '/reports/9',
    shortTitle: 'R09',
    fullTitle: 'Bao cao 09 - Ton kho theo mat hang',
    description: 'Tong hop ton kho theo ma mat hang trong cube ton kho.',
    filterMode: 'none',
  },
]

export const DASHBOARD_HIGHLIGHTS = [
  { label: 'Cube Build', value: '100%', note: 'SSAS da process xong' },
  { label: 'Report Templates', value: '9/9', note: 'FE da noi API that' },
  { label: 'Validation Cases', value: '24', note: 'San sang doi chieu OLAP/SQL' },
] as const
