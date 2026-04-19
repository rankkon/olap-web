import type { SelectOption } from '../types/filter'
import type { ReportRouteMeta } from '../types/report'

export const SIDEBAR_LINKS = [
  { to: '/', label: 'Tổng quan' },
  { to: '/olap', label: 'OLAP Explorer' },
  { to: '/reports', label: 'Báo cáo' },
] as const

export const TIME_OPTIONS: SelectOption[] = [
  { label: '2026', value: '2026' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
]

export const MEASURE_OPTIONS: SelectOption[] = [
  { label: 'Doanh thu', value: 'revenue' },
  { label: 'Số lượng hàng', value: 'orderCount' },
  { label: 'Tồn kho', value: 'inventory' },
]

export const DIMENSION_OPTIONS: SelectOption[] = [
  { label: 'Thời gian', value: 'time' },
  { label: 'Cửa hàng', value: 'store' },
  { label: 'Mặt hàng', value: 'product' },
  { label: 'Khách hàng', value: 'customer' },
]

export const REPORT_ROUTES: ReportRouteMeta[] = [
  {
    id: 1,
    path: '/reports/1',
    shortTitle: 'BC01',
    fullTitle: 'Báo cáo 01 - Tồn kho theo cửa hàng',
    description: 'Tổng hợp số lượng tồn kho theo từng mã cửa hàng.',
    filterMode: 'none',
  },
  {
    id: 2,
    path: '/reports/2',
    shortTitle: 'BC02',
    fullTitle: 'Báo cáo 02 - Doanh thu theo quý',
    description: 'Phân tích doanh thu bán hàng theo quý của năm được chọn.',
    filterMode: 'year',
  },
  {
    id: 3,
    path: '/reports/3',
    shortTitle: 'BC03',
    fullTitle: 'Báo cáo 03 - Doanh thu theo tháng',
    description: 'Khoan sâu doanh thu theo từng tháng của năm được chọn.',
    filterMode: 'year',
  },
  {
    id: 4,
    path: '/reports/4',
    shortTitle: 'BC04',
    fullTitle: 'Báo cáo 04 - Số lượng bán theo mặt hàng',
    description: 'Theo dõi các mặt hàng bán ra nhiều nhất theo số lượng.',
    filterMode: 'none',
  },
  {
    id: 5,
    path: '/reports/5',
    shortTitle: 'BC05',
    fullTitle: 'Báo cáo 05 - Doanh thu theo thành phố khách hàng',
    description: 'So sánh doanh thu theo nơi sinh sống của khách hàng.',
    filterMode: 'none',
  },
  {
    id: 6,
    path: '/reports/6',
    shortTitle: 'BC06',
    fullTitle: 'Báo cáo 06 - Top khách hàng theo doanh thu',
    description: 'Xếp hạng khách hàng đóng góp doanh thu cao nhất.',
    filterMode: 'none',
  },
  {
    id: 7,
    path: '/reports/7',
    shortTitle: 'BC07',
    fullTitle: 'Báo cáo 07 - Tồn kho theo bang',
    description: 'Tổng hợp tồn kho theo bang của hệ thống cửa hàng.',
    filterMode: 'none',
  },
  {
    id: 8,
    path: '/reports/8',
    shortTitle: 'BC08',
    fullTitle: 'Báo cáo 08 - Tồn kho theo thành phố',
    description: 'Tổng hợp tồn kho theo thành phố của cửa hàng.',
    filterMode: 'none',
  },
  {
    id: 9,
    path: '/reports/9',
    shortTitle: 'BC09',
    fullTitle: 'Báo cáo 09 - Tồn kho theo mặt hàng',
    description: 'Tổng hợp tồn kho theo mã mặt hàng trong cube tồn kho.',
    filterMode: 'none',
  },
]
