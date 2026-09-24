import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Product, ShopOrder } from './types'
import { money, dateText, statusLabels } from './types'

const paths: Record<string, ReactNode> = {
  diamond: (
    <>
      <path d="m3 8 5-5h8l5 5-9 13L3 8Z" />
      <path d="M3 8h18M8 3l4 18 4-18" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  cart: (
    <>
      <path d="M2 3h3l3 12h11l3-9H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v11H3V10Z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  flame: (
    <path d="M12 2c2 6-3 7-1 10 2-1 3-3 3-5 8 8 7 15-2 15C2 22 1 12 7 8c0 3 1 4 2 4-1-5 1-7 3-10Z" />
  ),
  bag: (
    <>
      <path d="M4 7h16l1 14H3L4 7Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 3v18h18M8 16v-5m5 5V6m5 10V9" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l3 3m10 10 3 3M4 20l3-3M17 7l3-3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H4v16h6m4-15 7 7-7 7m-5-7h12" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  phone: <path d="m7 3 3 5-3 3c2 4 3 5 6 6l3-3 5 3c-2 8-9 5-15-1S0 4 7 3Z" />,
}
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.diamond}
    </svg>
  )
}

// 原图保持不变，viewBox 选择截图中的商品区域；图片上传后直接按完整图片显示。
// 坐标：[左边距、上边距、宽、高]，单位为用户原图像素。
const crops: Record<string, [number, number, number, number]> = {
  leaf: [16, 232, 271, 271],
  wave: [304, 232, 271, 271],
  rose: [16, 683, 271, 272],
  gourd: [304, 683, 271, 272],
  horse: [16, 232, 271, 271],
  earrings: [304, 232, 271, 271],
  'purple-horse': [16, 683, 271, 272],
  'small-earrings': [304, 683, 271, 272],
  lotus: [31, 688, 167, 167],
  pendant: [209, 688, 167, 167],
  bamboo: [386, 688, 167, 167],
  beads: [31, 940, 167, 167],
  wedding: [210, 940, 167, 167],
  charm: [24, 227, 139, 139],
}
export function ProductImage({
  imageUrl,
  imageCrop,
  name = '',
  className = '',
}: {
  imageUrl: string
  imageCrop: string
  name?: string
  className?: string
}) {
  const crop = crops[imageCrop]
  return (
    <div className={`product-image ${className}`}>
      {crop ? (
        <svg
          viewBox={crop.join(' ')}
          role="img"
          aria-label={name}
          preserveAspectRatio="xMidYMid slice"
        >
          <image href={imageUrl} width="591" height="1280" />
        </svg>
      ) : (
        <img src={imageUrl} alt={name} loading="lazy" />
      )}
    </div>
  )
}

export function ProductCard({ product: p, add }: { product: Product; add: (p: Product) => void }) {
  return (
    <article className="product-card">
      <a href={`#/product/${p.id}`} className="product-photo-link" aria-label={`查看${p.name}`}>
        <ProductImage {...p} />
        {p.fresh && <span className="photo-label">NEW · 新品</span>}
        {p.stock === 0 && <span className="sold-out">暂时售罄</span>}
      </a>
      <div className="product-card-body">
        <div className="product-meta">
          <span>{p.material}</span>
          <span>{p.weightMin > 0 ? `${p.weightMin}–${p.weightMax}g` : '精选礼品'}</span>
        </div>
        <a href={`#/product/${p.id}`} className="product-name">
          {p.name}
        </a>
        <div className="product-card-bottom">
          <div>
            <span className="currency">¥</span>
            <strong>{money(p.price)}</strong>
            <small>库存 {p.stock}</small>
          </div>
          <button
            className="add-circle"
            title="加入购物车"
            aria-label={`加入购物车：${p.name}`}
            disabled={p.stock === 0}
            onClick={() => add(p)}
          >
            <Icon name="bag" size={18} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string
  children: ReactNode
  close: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // 原生 dialog 提供焦点约束；Esc 通过 onCancel 回到 React 的关闭流程。
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭弹窗" onClick={close}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Empty({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name="bag" size={40} />
      </div>
      <h2>{title}</h2>
      <p>{detail}</p>
      {children}
    </div>
  )
}

// children 是组件的插槽：访客只看订单，后台在同一张卡片中插入状态操作按钮。
export function OrderCard({ order, children }: { order: ShopOrder; children?: ReactNode }) {
  return (
    <article className="order-card">
      <div className="order-card-heading">
        <div>
          <strong>{order.id}</strong>
          <small>{dateText(order.createdAt)}</small>
        </div>
        <span className={`status-badge ${order.status.toLowerCase()}`}>
          {statusLabels[order.status]}
        </span>
      </div>
      {order.items.map((item) => (
        <div className="order-line" key={item.productId}>
          <ProductImage {...item} />
          <div>
            <strong>{item.name}</strong>
            <small>
              {item.sku} · 数量 {item.quantity}
            </small>
          </div>
          <strong>¥{money(item.price * item.quantity)}</strong>
        </div>
      ))}
      <div className="order-delivery">
        <span>
          {order.customerName} · {order.phone}
        </span>
        <p>{order.address}</p>
        {order.note && <p>备注：{order.note}</p>}
      </div>
      <div className="order-card-footer">
        <span>
          商品合计 <strong>¥{money(order.total)}</strong>
        </span>
        {children}
      </div>
    </article>
  )
}
