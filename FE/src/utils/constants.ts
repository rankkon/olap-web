import type { SelectOption } from '../types/filter'
import type { OlapPivotResult } from '../types/olap'
import type { ReportData, ReportRouteMeta } from '../types/report'

export const SIDEBAR_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/olap', label: 'OLAP Explorer' },
  { to: '/reports', label: 'Reports' },
  { to: '/compare', label: 'Data Validation' },
] as const

export const TIME_OPTIONS: SelectOption[] = [
  { label: '2026 - Q1', value: '2026-Q1' },
  { label: '2025 - Q4', value: '2025-Q4' },
  { label: '2025 - Q3', value: '2025-Q3' },
  { label: '2025 - Q2', value: '2025-Q2' },
]

export const CITY_OPTIONS: SelectOption[] = [
  { label: 'Hà Nội', value: 'hanoi' },
  { label: 'TP. Hồ Chí Minh', value: 'hcm' },
  { label: 'Đà Nẵng', value: 'danang' },
  { label: 'Hải Phòng', value: 'haiphong' },
  { label: 'Cần Thơ', value: 'cantho' },
]

export const STORE_OPTIONS: SelectOption[] = [
  { label: 'Store A01', value: 'store-a01' },
  { label: 'Store B15', value: 'store-b15' },
  { label: 'Store C22', value: 'store-c22' },
  { label: 'Store D09', value: 'store-d09' },
]

export const PRODUCT_OPTIONS: SelectOption[] = [
  { label: 'Road Bike', value: 'road-bike' },
  { label: 'Helmet Pro', value: 'helmet-pro' },
  { label: 'Touring Tire', value: 'touring-tire' },
  { label: 'City Backpack', value: 'city-backpack' },
  { label: 'Repair Kit', value: 'repair-kit' },
]

export const CUSTOMER_OPTIONS: SelectOption[] = [
  { label: 'Corporate', value: 'corporate' },
  { label: 'Retail', value: 'retail' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'VIP', value: 'vip' },
]

export const MEASURE_OPTIONS: SelectOption[] = [
  { label: 'Revenue', value: 'revenue' },
  { label: 'Order Count', value: 'orderCount' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Profit', value: 'profit' },
]

export const DIMENSION_OPTIONS: SelectOption[] = [
  { label: 'Time', value: 'time' },
  { label: 'City', value: 'city' },
  { label: 'Store', value: 'store' },
  { label: 'Product', value: 'product' },
  { label: 'Customer', value: 'customer' },
]

export const HIERARCHY_LEVELS: SelectOption[] = [
  { label: 'Year', value: 'year' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Month', value: 'month' },
  { label: 'Day', value: 'day' },
]

export const REPORT_ROUTES: ReportRouteMeta[] = [
  {
    id: 1,
    path: '/reports/1',
    shortTitle: 'R01',
    fullTitle: 'Báo cáo 01 - Sản phẩm theo cửa hàng',
    description: 'Theo dõi danh mục sản phẩm và doanh thu theo từng cửa hàng.',
  },
  {
    id: 2,
    path: '/reports/2',
    shortTitle: 'R02',
    fullTitle: 'Báo cáo 02 - Đơn hàng theo khách hàng',
    description: 'Phân tích tần suất và giá trị đơn hàng theo nhóm khách hàng.',
  },
  {
    id: 3,
    path: '/reports/3',
    shortTitle: 'R03',
    fullTitle: 'Báo cáo 03 - Cửa hàng theo khách hàng và sản phẩm',
    description: 'Xem tương quan khách hàng, cửa hàng và danh mục sản phẩm.',
  },
  {
    id: 4,
    path: '/reports/4',
    shortTitle: 'R04',
    fullTitle: 'Báo cáo 04 - Văn phòng theo ngưỡng tồn kho',
    description: 'Theo dõi ngưỡng tồn kho cảnh báo tại từng văn phòng.',
  },
  {
    id: 5,
    path: '/reports/5',
    shortTitle: 'R05',
    fullTitle: 'Báo cáo 05 - Chi tiết dòng đơn hàng và cửa hàng',
    description: 'Giám sát hiệu suất order item theo cụm cửa hàng.',
  },
  {
    id: 6,
    path: '/reports/6',
    shortTitle: 'R06',
    fullTitle: 'Báo cáo 06 - Vị trí khách hàng',
    description: 'Bản đồ hóa phân bố khách hàng theo khu vực địa lý.',
  },
  {
    id: 7,
    path: '/reports/7',
    shortTitle: 'R07',
    fullTitle: 'Báo cáo 07 - Tồn kho theo thành phố',
    description: 'So sánh mức tồn kho và tốc độ quay vòng giữa các thành phố.',
  },
  {
    id: 8,
    path: '/reports/8',
    shortTitle: 'R08',
    fullTitle: 'Báo cáo 08 - Chi tiết đơn hàng',
    description: 'Drill-down từng đơn hàng, trạng thái giao hàng và giá trị.',
  },
  {
    id: 9,
    path: '/reports/9',
    shortTitle: 'R09',
    fullTitle: 'Báo cáo 09 - Nhóm khách hàng',
    description: 'Phân nhóm khách hàng theo hành vi mua và đóng góp doanh thu.',
  },
]

export const DASHBOARD_HIGHLIGHTS = [
  { label: 'Cube Build', value: '92%', note: 'Pre-aggregation gần hoàn tất' },
  { label: 'Report Templates', value: '9/9', note: 'Đầy đủ khung giao diện' },
  { label: 'Validation Cases', value: '24', note: 'Sẵn sàng đối chiếu OLAP/SQL' },
] as const

export const MOCK_REPORT_DATA: Record<number, ReportData> = {
  1: {
    id: 1,
    title: 'Sản phẩm theo cửa hàng',
    description: 'Theo dõi doanh thu và tồn kho sản phẩm tại từng cửa hàng.',
    kpis: [
      { label: 'Doanh thu', value: '3.45 tỷ', trend: '+8.2%' },
      { label: 'Sản phẩm bán', value: '14,320', trend: '+5.1%' },
      { label: 'Tồn kho cuối kỳ', value: '2,180', trend: '-3.8%' },
    ],
    barSeries: [
      { label: 'A01', value: 820 },
      { label: 'B15', value: 640 },
      { label: 'C22', value: 710 },
      { label: 'D09', value: 510 },
    ],
    lineSeries: [
      { label: 'Th1', value: 500 },
      { label: 'Th2', value: 550 },
      { label: 'Th3', value: 610 },
      { label: 'Th4', value: 580 },
      { label: 'Th5', value: 690 },
    ],
    pieSeries: [
      { label: 'Xe đạp', value: 44 },
      { label: 'Phụ kiện', value: 32 },
      { label: 'Dịch vụ', value: 24 },
    ],
    columns: [
      { key: 'store', label: 'Cửa hàng' },
      { key: 'product', label: 'Sản phẩm' },
      { key: 'qty', label: 'Số lượng', align: 'right' },
      { key: 'revenue', label: 'Doanh thu (triệu)', align: 'right' },
    ],
    rows: [
      { store: 'Store A01', product: 'Road Bike', qty: 320, revenue: 980 },
      { store: 'Store B15', product: 'Helmet Pro', qty: 460, revenue: 210 },
      { store: 'Store C22', product: 'Touring Tire', qty: 520, revenue: 340 },
      { store: 'Store D09', product: 'City Backpack', qty: 280, revenue: 160 },
      { store: 'Store A01', product: 'Repair Kit', qty: 410, revenue: 130 },
    ],
  },
  2: {
    id: 2,
    title: 'Đơn hàng theo khách hàng',
    description: 'Theo dõi số đơn hàng, giá trị và tần suất mua theo nhóm khách hàng.',
    kpis: [
      { label: 'Số đơn', value: '8,940', trend: '+11.4%' },
      { label: 'Khách hoạt động', value: '2,150', trend: '+6.7%' },
      { label: 'Giá trị TB/đơn', value: '1.24 triệu', trend: '+2.9%' },
    ],
    barSeries: [
      { label: 'Corporate', value: 520 },
      { label: 'Retail', value: 860 },
      { label: 'Wholesale', value: 390 },
      { label: 'VIP', value: 440 },
    ],
    lineSeries: [
      { label: 'W1', value: 120 },
      { label: 'W2', value: 150 },
      { label: 'W3', value: 143 },
      { label: 'W4', value: 168 },
    ],
    pieSeries: [
      { label: 'Mới', value: 18 },
      { label: 'Quay lại', value: 57 },
      { label: 'Trung thành', value: 25 },
    ],
    columns: [
      { key: 'customer', label: 'Khách hàng' },
      { key: 'segment', label: 'Phân khúc' },
      { key: 'orders', label: 'Số đơn', align: 'right' },
      { key: 'value', label: 'Tổng giá trị (triệu)', align: 'right' },
    ],
    rows: [
      { customer: 'Nguyen Van A', segment: 'Retail', orders: 28, value: 55 },
      { customer: 'Tran Thi B', segment: 'VIP', orders: 41, value: 102 },
      { customer: 'ABC Co.', segment: 'Corporate', orders: 17, value: 189 },
      { customer: 'Minh Duc', segment: 'Retail', orders: 21, value: 38 },
      { customer: 'Green Mart', segment: 'Wholesale', orders: 14, value: 121 },
    ],
  },
  3: {
    id: 3,
    title: 'Cửa hàng theo khách hàng và sản phẩm',
    description: 'Khớp nhu cầu khách hàng với danh mục sản phẩm ở từng cửa hàng.',
    kpis: [
      { label: 'Cặp Store-Product', value: '1,280', trend: '+4.3%' },
      { label: 'Khách có giao dịch', value: '1,902', trend: '+3.7%' },
      { label: 'Mức phủ sản phẩm', value: '78%', trend: '+2.1%' },
    ],
    barSeries: [
      { label: 'A01', value: 72 },
      { label: 'B15', value: 66 },
      { label: 'C22', value: 79 },
      { label: 'D09', value: 61 },
    ],
    lineSeries: [
      { label: 'Q1', value: 61 },
      { label: 'Q2', value: 67 },
      { label: 'Q3', value: 74 },
      { label: 'Q4', value: 78 },
    ],
    pieSeries: [
      { label: 'Top 20%', value: 51 },
      { label: 'Middle 50%', value: 37 },
      { label: 'Long-tail', value: 12 },
    ],
    columns: [
      { key: 'store', label: 'Cửa hàng' },
      { key: 'customerType', label: 'Nhóm khách' },
      { key: 'product', label: 'Sản phẩm chủ đạo' },
      { key: 'coverage', label: 'Độ phủ (%)', align: 'right' },
    ],
    rows: [
      { store: 'Store A01', customerType: 'Corporate', product: 'Road Bike', coverage: 84 },
      { store: 'Store B15', customerType: 'Retail', product: 'Helmet Pro', coverage: 76 },
      { store: 'Store C22', customerType: 'VIP', product: 'City Backpack', coverage: 81 },
      { store: 'Store D09', customerType: 'Wholesale', product: 'Touring Tire', coverage: 69 },
      { store: 'Store A01', customerType: 'VIP', product: 'Repair Kit', coverage: 74 },
    ],
  },
  4: {
    id: 4,
    title: 'Văn phòng theo ngưỡng tồn kho',
    description: 'Theo dõi các văn phòng/cửa hàng đang tiệm cận ngưỡng tồn kho tối thiểu.',
    kpis: [
      { label: 'Cảnh báo đỏ', value: '7', trend: '+1' },
      { label: 'Cảnh báo vàng', value: '14', trend: '-2' },
      { label: 'An toàn', value: '29', trend: '+4' },
    ],
    barSeries: [
      { label: 'HN', value: 18 },
      { label: 'HCM', value: 22 },
      { label: 'DN', value: 9 },
      { label: 'HP', value: 11 },
    ],
    lineSeries: [
      { label: 'Tuần 1', value: 9 },
      { label: 'Tuần 2', value: 11 },
      { label: 'Tuần 3', value: 8 },
      { label: 'Tuần 4', value: 7 },
    ],
    pieSeries: [
      { label: 'Đỏ', value: 14 },
      { label: 'Vàng', value: 28 },
      { label: 'Xanh', value: 58 },
    ],
    columns: [
      { key: 'office', label: 'Văn phòng' },
      { key: 'product', label: 'Sản phẩm' },
      { key: 'stock', label: 'Tồn hiện tại', align: 'right' },
      { key: 'threshold', label: 'Ngưỡng min', align: 'right' },
      { key: 'status', label: 'Trạng thái' },
    ],
    rows: [
      { office: 'HN-01', product: 'Road Bike', stock: 21, threshold: 30, status: 'Đỏ' },
      { office: 'HCM-03', product: 'Helmet Pro', stock: 44, threshold: 40, status: 'Xanh' },
      { office: 'DN-02', product: 'Repair Kit', stock: 17, threshold: 20, status: 'Vàng' },
      { office: 'HP-01', product: 'Touring Tire', stock: 14, threshold: 18, status: 'Vàng' },
      { office: 'CT-01', product: 'City Backpack', stock: 8, threshold: 15, status: 'Đỏ' },
    ],
  },
  5: {
    id: 5,
    title: 'Chi tiết dòng đơn hàng và cửa hàng',
    description: 'Theo dõi order item theo cửa hàng để tối ưu quy trình fulfillment.',
    kpis: [
      { label: 'Order items', value: '42,500', trend: '+9.0%' },
      { label: 'Fill rate', value: '96.4%', trend: '+1.3%' },
      { label: 'Delay line', value: '1,130', trend: '-7.2%' },
    ],
    barSeries: [
      { label: 'A01', value: 920 },
      { label: 'B15', value: 860 },
      { label: 'C22', value: 980 },
      { label: 'D09', value: 690 },
    ],
    lineSeries: [
      { label: 'Mon', value: 110 },
      { label: 'Tue', value: 124 },
      { label: 'Wed', value: 130 },
      { label: 'Thu', value: 118 },
      { label: 'Fri', value: 142 },
    ],
    pieSeries: [
      { label: 'On-time', value: 82 },
      { label: 'Late', value: 12 },
      { label: 'Canceled', value: 6 },
    ],
    columns: [
      { key: 'orderId', label: 'Mã đơn' },
      { key: 'store', label: 'Cửa hàng' },
      { key: 'item', label: 'Mặt hàng' },
      { key: 'qty', label: 'SL', align: 'right' },
      { key: 'status', label: 'Trạng thái' },
    ],
    rows: [
      { orderId: 'OD-1201', store: 'Store A01', item: 'Road Bike', qty: 2, status: 'On-time' },
      { orderId: 'OD-1202', store: 'Store B15', item: 'Helmet Pro', qty: 8, status: 'On-time' },
      { orderId: 'OD-1203', store: 'Store C22', item: 'Touring Tire', qty: 6, status: 'Late' },
      { orderId: 'OD-1204', store: 'Store D09', item: 'Repair Kit', qty: 10, status: 'On-time' },
      { orderId: 'OD-1205', store: 'Store C22', item: 'City Backpack', qty: 3, status: 'Canceled' },
    ],
  },
  6: {
    id: 6,
    title: 'Vị trí khách hàng',
    description: 'Phân tích mật độ và giá trị khách hàng theo thành phố/khu vực.',
    kpis: [
      { label: 'Khách hàng', value: '12,640', trend: '+4.8%' },
      { label: 'Thành phố active', value: '22', trend: '+2' },
      { label: 'AOV theo vùng', value: '1.16 triệu', trend: '+3.2%' },
    ],
    barSeries: [
      { label: 'HCM', value: 3200 },
      { label: 'HN', value: 2800 },
      { label: 'DN', value: 1220 },
      { label: 'HP', value: 980 },
    ],
    lineSeries: [
      { label: 'North', value: 44 },
      { label: 'Central', value: 31 },
      { label: 'South', value: 52 },
    ],
    pieSeries: [
      { label: 'Nội thành', value: 61 },
      { label: 'Ngoại thành', value: 24 },
      { label: 'Tỉnh lân cận', value: 15 },
    ],
    columns: [
      { key: 'city', label: 'Thành phố' },
      { key: 'customers', label: 'Số KH', align: 'right' },
      { key: 'orders', label: 'Số đơn', align: 'right' },
      { key: 'revenue', label: 'Doanh thu (triệu)', align: 'right' },
    ],
    rows: [
      { city: 'TP. Hồ Chí Minh', customers: 3200, orders: 12900, revenue: 15800 },
      { city: 'Hà Nội', customers: 2800, orders: 11440, revenue: 13950 },
      { city: 'Đà Nẵng', customers: 1220, orders: 4820, revenue: 5220 },
      { city: 'Hải Phòng', customers: 980, orders: 3950, revenue: 4010 },
      { city: 'Cần Thơ', customers: 860, orders: 3310, revenue: 3550 },
    ],
  },
  7: {
    id: 7,
    title: 'Tồn kho theo thành phố',
    description: 'So sánh lượng tồn kho, vòng quay và rủi ro thiếu hàng theo từng thành phố.',
    kpis: [
      { label: 'Tổng tồn', value: '18,900', trend: '-2.4%' },
      { label: 'Vòng quay', value: '6.1', trend: '+0.3' },
      { label: 'Rủi ro thiếu hàng', value: '12%', trend: '-1.1%' },
    ],
    barSeries: [
      { label: 'HCM', value: 5200 },
      { label: 'HN', value: 4800 },
      { label: 'DN', value: 2300 },
      { label: 'HP', value: 1900 },
    ],
    lineSeries: [
      { label: 'Q1', value: 5600 },
      { label: 'Q2', value: 5300 },
      { label: 'Q3', value: 5000 },
      { label: 'Q4', value: 4700 },
    ],
    pieSeries: [
      { label: 'Bike', value: 49 },
      { label: 'Accessory', value: 37 },
      { label: 'Spare part', value: 14 },
    ],
    columns: [
      { key: 'city', label: 'Thành phố' },
      { key: 'stock', label: 'Tồn kho', align: 'right' },
      { key: 'turnover', label: 'Vòng quay', align: 'right' },
      { key: 'risk', label: 'Rủi ro thiếu hàng' },
    ],
    rows: [
      { city: 'TP. Hồ Chí Minh', stock: 5200, turnover: 6.4, risk: 'Thấp' },
      { city: 'Hà Nội', stock: 4800, turnover: 6.1, risk: 'Thấp' },
      { city: 'Đà Nẵng', stock: 2300, turnover: 5.8, risk: 'Trung bình' },
      { city: 'Hải Phòng', stock: 1900, turnover: 5.2, risk: 'Trung bình' },
      { city: 'Cần Thơ', stock: 1600, turnover: 4.9, risk: 'Cao' },
    ],
  },
  8: {
    id: 8,
    title: 'Chi tiết đơn hàng',
    description: 'Drill-down thông tin từng đơn hàng để kiểm soát vận hành.',
    kpis: [
      { label: 'Đơn hoàn tất', value: '92.8%', trend: '+1.4%' },
      { label: 'Lead time TB', value: '2.8 ngày', trend: '-0.4 ngày' },
      { label: 'Tỷ lệ hoàn trả', value: '1.9%', trend: '-0.2%' },
    ],
    barSeries: [
      { label: 'Completed', value: 928 },
      { label: 'Shipping', value: 54 },
      { label: 'Delayed', value: 12 },
      { label: 'Returned', value: 19 },
    ],
    lineSeries: [
      { label: 'T1', value: 2.9 },
      { label: 'T2', value: 2.8 },
      { label: 'T3', value: 3.0 },
      { label: 'T4', value: 2.7 },
      { label: 'T5', value: 2.6 },
    ],
    pieSeries: [
      { label: 'Online', value: 62 },
      { label: 'In-store', value: 24 },
      { label: 'Partner', value: 14 },
    ],
    columns: [
      { key: 'orderId', label: 'Mã đơn' },
      { key: 'customer', label: 'Khách hàng' },
      { key: 'city', label: 'Thành phố' },
      { key: 'amount', label: 'Giá trị (triệu)', align: 'right' },
      { key: 'status', label: 'Trạng thái' },
    ],
    rows: [
      { orderId: 'OD-9811', customer: 'Nguyen Van A', city: 'HCM', amount: 8.2, status: 'Completed' },
      { orderId: 'OD-9812', customer: 'Tran Thi B', city: 'HN', amount: 3.7, status: 'Shipping' },
      { orderId: 'OD-9813', customer: 'ABC Co.', city: 'DN', amount: 12.4, status: 'Completed' },
      { orderId: 'OD-9814', customer: 'Le Minh', city: 'HP', amount: 1.9, status: 'Delayed' },
      { orderId: 'OD-9815', customer: 'Thanh Ngo', city: 'HCM', amount: 4.3, status: 'Returned' },
    ],
  },
  9: {
    id: 9,
    title: 'Nhóm khách hàng',
    description: 'Phân loại khách hàng theo hành vi mua để lập chiến lược chăm sóc.',
    kpis: [
      { label: 'Nhóm hoạt động', value: '4', trend: 'Ổn định' },
      { label: 'Retention 90 ngày', value: '73%', trend: '+2.0%' },
      { label: 'CLV ước tính', value: '15.4 triệu', trend: '+5.6%' },
    ],
    barSeries: [
      { label: 'VIP', value: 22 },
      { label: 'Loyal', value: 36 },
      { label: 'Potential', value: 28 },
      { label: 'At Risk', value: 14 },
    ],
    lineSeries: [
      { label: 'M1', value: 62 },
      { label: 'M2', value: 66 },
      { label: 'M3', value: 69 },
      { label: 'M4', value: 72 },
    ],
    pieSeries: [
      { label: 'Doanh thu VIP', value: 46 },
      { label: 'Doanh thu Loyal', value: 34 },
      { label: 'Doanh thu khác', value: 20 },
    ],
    columns: [
      { key: 'segment', label: 'Nhóm khách hàng' },
      { key: 'customers', label: 'Số KH', align: 'right' },
      { key: 'avgOrder', label: 'Đơn TB (triệu)', align: 'right' },
      { key: 'retention', label: 'Retention' },
    ],
    rows: [
      { segment: 'VIP', customers: 420, avgOrder: 5.2, retention: '89%' },
      { segment: 'Loyal', customers: 1150, avgOrder: 2.6, retention: '82%' },
      { segment: 'Potential', customers: 1780, avgOrder: 1.7, retention: '63%' },
      { segment: 'At Risk', customers: 760, avgOrder: 1.1, retention: '41%' },
      { segment: 'New', customers: 980, avgOrder: 0.9, retention: '28%' },
    ],
  },
}

export const EMPTY_REPORT_DATA: ReportData = {
  id: 0,
  title: 'Placeholder report',
  description: 'TODO: Nối dữ liệu thật từ backend.',
  kpis: [],
  barSeries: [],
  lineSeries: [],
  pieSeries: [],
  columns: [],
  rows: [],
}

export const MOCK_OLAP_PIVOT: OlapPivotResult = {
  columnHeaders: ['Q1', 'Q2', 'Q3', 'Q4'],
  rows: [
    { label: 'Hà Nội', values: [320, 350, 380, 410] },
    { label: 'TP. Hồ Chí Minh', values: [410, 450, 490, 530] },
    { label: 'Đà Nẵng', values: [180, 195, 210, 225] },
    { label: 'Hải Phòng', values: [140, 152, 168, 179] },
  ],
  total: 4629,
}
