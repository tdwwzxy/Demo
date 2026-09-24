// interface 类似 Java DTO；仅用于编译期检查，运行时仍必须由后端校验请求。
export interface Product {
  id: number
  sku: string
  name: string
  category: string
  material: string
  price: number
  weightMin: number
  weightMax: number
  laborFee: number
  stock: number
  imageUrl: string
  imageCrop: string
  description: string
  featured: boolean
  fresh: boolean
  active: boolean
  updatedAt: string
}
// Omit 从已有类型排除指定字段，相当于由响应 DTO 推导“创建/编辑请求 DTO”。
export type ProductInput = Omit<Product, 'id' | 'updatedAt'>
export interface Store {
  name: string
  tagline: string
  phone: string
  wechat: string
  notice: string
}
export interface GoldPrice {
  material: string
  price: number
  source: string
  updatedAt: string
}
// 联合类型限制合法值，作用类似 Java enum。
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
export interface OrderItem {
  productId: number
  name: string
  sku: string
  price: number
  quantity: number
  imageUrl: string
  imageCrop: string
}
export interface ShopOrder {
  id: string
  customerName: string
  phone: string
  address: string
  note: string
  status: OrderStatus
  total: number
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}
export interface CartLine {
  productId: number
  quantity: number
}
export interface Dashboard {
  products: number
  activeProducts: number
  orders: number
  pendingOrders: number
  lowStock: number
  database: string
  serverTime: string
  audit: { id: number; action: string; detail: string; createdAt: string }[]
}
export const categories = ['戒指', '手镯', '手链', '项链', '吊坠', '耳饰', '手串配件', '礼品']
// Record<K,V> 表示键为 K、值为 V 的映射；漏掉一个 OrderStatus 会触发类型检查错误。
export const statusLabels: Record<OrderStatus, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}
export const money = (value: number) =>
  new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value,
  )
export const dateText = (value: string) =>
  new Date(value).toLocaleString('zh-CN', { hour12: false })
