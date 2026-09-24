import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError, errorMessage } from './api'
import { categories, dateText, money } from './types'
import type {
  Dashboard,
  GoldPrice,
  OrderStatus,
  Product,
  ProductInput,
  ShopOrder,
  Store,
} from './types'
import { Empty, Icon, Modal, OrderCard, ProductImage } from './components'

// 字符串联合类型限制合法页面；元组 [Tab, string, string] 固定每一列的顺序与类型。
type Tab = 'overview' | 'products' | 'orders' | 'prices' | 'store'
const tabs: [Tab, string, string][] = [
  ['overview', 'chart', '运营概览'],
  ['products', 'diamond', '商品管理'],
  ['orders', 'bag', '订单管理'],
  ['prices', 'upload', '价格与导入'],
  ['store', 'settings', '店铺设置'],
]

export default function Admin({
  refreshStore,
  notify,
}: {
  refreshStore: () => Promise<void>
  notify: (message: string) => void
}) {
  // null 表示尚未检查，false 是未登录，true 是服务器确认已登录；前端状态不代替后端鉴权。
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [prices, setPrices] = useState<GoldPrice[]>([])
  const [store, setStore] = useState<Store | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  // 用联合类型表达弹窗的三种状态：编辑已有 DTO、创建新商品、不显示弹窗。
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [csv, setCsv] = useState<File | null>(null)
  const [csvVersion, setCsvVersion] = useState(0)
  useEffect(() => {
    // 异步请求返回前用户可能离开页面，清理函数把 active 置为 false，避免使用过时结果。
    let active = true
    api('/auth/me')
      .then(() => {
        if (active) setAuthenticated(true)
      })
      .catch((e) => {
        if (active) {
          setAuthenticated(false)
          if (!(e instanceof ApiError && e.status === 401)) setError(errorMessage(e))
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function load() {
    const [p, o, g, s, d] = await Promise.all([
      api<Product[]>('/admin/products'),
      api<ShopOrder[]>('/admin/orders'),
      api<GoldPrice[]>('/prices'),
      api<Store>('/store'),
      api<Dashboard>('/admin/dashboard'),
    ])
    setProducts(p)
    setOrders(o)
    setPrices(g)
    setStore(s)
    setDashboard(d)
  }
  useEffect(() => {
    if (authenticated)
      void load().catch((e) => {
        setError(errorMessage(e))
        if (e instanceof ApiError && e.status === 401) setAuthenticated(false)
      })
  }, [authenticated])
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await api('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: String(form.get('username')),
          password: String(form.get('password')),
        }).toString(),
      })
      setAuthenticated(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  // 函数也是参数：把各类写操作传进来，复用 busy、错误提示、重新加载等公共流程。
  async function operate(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError('')
    try {
      await action()
      notify(message)
      await load()
      await refreshStore()
    } catch (e) {
      setError(errorMessage(e))
      if (e instanceof ApiError && e.status === 401) setAuthenticated(false)
    } finally {
      setBusy(false)
    }
  }
  async function logout() {
    setBusy(true)
    try {
      await api('/auth/logout', { method: 'POST' })
      setAuthenticated(false)
      setEditing(null)
      setError('')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  if (authenticated === null) return <div className="loading">正在检查运营会话…</div>
  if (!authenticated)
    return (
      <div className="login-page">
        <div className="login-brand">
          <Icon name="diamond" size={54} />
          <div className="eyebrow">SHIGUANG STUDIO</div>
          <h1>
            好生意，
            <br />
            从每一个细节开始。
          </h1>
          <p>
            把商品的光芒，交给你。
            <br />
            把日常的经营，交给拾光。
          </p>
          <a href="#/">← 返回访客商城</a>
        </div>
        <div className="login-form-area">
          <form className="login-form form-stack" onSubmit={login}>
            <div className="eyebrow">MERCHANT WORKSPACE</div>
            <h2>欢迎回到商家工作台</h2>
            <p className="muted">管理商品、价格、库存与每一份心意。</p>
            <label>
              管理员账号
              <input name="username" autoComplete="username" defaultValue="admin" required />
            </label>
            <label>
              登录密码
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入管理员密码"
                required
              />
            </label>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? '正在登录…' : '登录工作台'}
              <Icon name="arrow" size={18} />
            </button>
            <p className="login-help">仅供店铺运营人员使用。访客选购无需登录。</p>
          </form>
        </div>
      </div>
    )
  const filtered = products.filter((p) =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
  )
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="brand" href="#/">
          <Icon name="diamond" size={31} />
          <span>
            拾光珠宝<small>MERCHANT STUDIO</small>
          </span>
        </a>
        <span className="sidebar-label">工作空间</span>
        <nav>
          {tabs.map(([value, icon, label]) => (
            <button
              key={value}
              className={tab === value ? 'active' : ''}
              onClick={() => {
                setTab(value)
                setError('')
              }}
            >
              <Icon name={icon} />
              {label}
              {value === 'orders' && !!dashboard?.pendingOrders && <b>{dashboard.pendingOrders}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#/">
            查看商城 <Icon name="arrow" size={17} />
          </a>
          <div className="admin-account">
            <span>A</span>
            <div>
              <strong>admin</strong>
              <small>店铺管理员</small>
            </div>
            <button
              aria-label="退出登录"
              className="icon-button"
              disabled={busy}
              onClick={() => void logout()}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <span>
            拾光珠宝 / <strong>{tabs.find((t) => t[0] === tab)?.[2]}</strong>
          </span>
          <span className="system-live">
            <i />
            系统运行中 <small>本地演示</small>
          </span>
        </header>
        <div className="admin-content">
          <div className="section-heading">
            <div>
              <div className="eyebrow">YOUR BUSINESS, AT A GLANCE</div>
              <h1>{tabs.find((t) => t[0] === tab)?.[2]}</h1>
              <p className="muted">让每一件商品，都以最好的状态被看见。</p>
            </div>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => void operate(async () => undefined, '数据已刷新')}
            >
              刷新数据
            </button>
          </div>
          {error && (
            <div className="field-error error-box" role="alert">
              {error}
            </div>
          )}
          {tab === 'overview' && dashboard && (
            <>
              <div className="metric-grid">
                {[
                  ['在售商品', dashboard.activeProducts, 'diamond'],
                  ['全部订单', dashboard.orders, 'bag'],
                  ['待确认订单', dashboard.pendingOrders, 'clock'],
                  ['低库存商品', dashboard.lowStock, 'grid'],
                ].map(([label, value, icon]) => (
                  <article className="metric-card" key={label}>
                    <span>
                      {label}
                      <Icon name={String(icon)} />
                    </span>
                    <strong>{value}</strong>
                    <small>{label === '低库存商品' ? '库存少于 5 件' : '数据来自当前数据库'}</small>
                  </article>
                ))}
              </div>
              <div className="overview-columns">
                <section className="admin-panel">
                  <div className="section-heading">
                    <h2>最近操作</h2>
                    <span className="count-tag">审计记录</span>
                  </div>
                  {dashboard.audit.length ? (
                    <div className="audit-list">
                      {dashboard.audit.map((a) => (
                        <div key={a.id}>
                          <span className="audit-dot" />
                          <div>
                            <strong>{a.action}</strong>
                            <p>{a.detail}</p>
                            <small>{dateText(a.createdAt)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="经营日志，从这里开始"
                      detail="商品修改、价格导入等操作会自动记录。"
                    />
                  )}
                </section>
                <aside className="admin-panel quick-panel">
                  <Icon name="diamond" size={36} />
                  <h2>上架你的第一份心意</h2>
                  <p>完善商品图片、价格与库存，新的商品会立即出现在商城。</p>
                  <button
                    className="primary"
                    onClick={() => {
                      setTab('products')
                      setEditing('new')
                    }}
                  >
                    新增商品 <Icon name="arrow" size={18} />
                  </button>
                  <hr />
                  <h3>服务状态</h3>
                  <div className="service-status">
                    <span>数据库</span>
                    <b>● {dashboard.database}</b>
                  </div>
                  <div className="service-status">
                    <span>订单模式</span>
                    <strong>访客预订 / 商家确认</strong>
                  </div>
                  <p className="muted">价格导入前请下载模板。当前示例金价不是实时行情。</p>
                </aside>
              </div>
            </>
          )}
          {tab === 'products' && (
            <section className="admin-panel">
              <div className="admin-toolbar">
                <div className="input-search">
                  <Icon name="search" size={18} />
                  <input
                    aria-label="搜索后台商品"
                    placeholder="搜索商品名称、款号或分类"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="primary" onClick={() => setEditing('new')}>
                  ＋ 新增商品
                </button>
              </div>
              <div className="table-wrap">
                <table className="admin-products">
                  <thead>
                    <tr>
                      <th>商品 / 款号</th>
                      <th>分类</th>
                      <th>售价</th>
                      <th>库存</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="table-product">
                            <ProductImage {...p} />
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.sku}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {p.category}
                          <small>{p.material}</small>
                        </td>
                        <td className="price">¥{money(p.price)}</td>
                        <td>
                          <span className={p.stock < 5 ? 'low-stock' : ''}>{p.stock}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${p.active ? 'confirmed' : 'cancelled'}`}>
                            {p.active ? '在售' : '已下架'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="text-button" onClick={() => setEditing(p)}>
                              编辑
                            </button>
                            <button
                              className="text-button muted"
                              disabled={busy}
                              onClick={() =>
                                void operate(
                                  () =>
                                    api(`/admin/products/${p.id}`, {
                                      method: 'PUT',
                                      body: JSON.stringify({ ...p, active: !p.active }),
                                    }),
                                  p.active ? '商品已下架' : '商品已上架',
                                )
                              }
                            >
                              {p.active ? '下架' : '上架'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filtered.length && <p className="muted">没有匹配的商品。</p>}
              <div className="table-footer">
                共 {filtered.length} 件商品 · 图片和价格更新后立即对访客生效
              </div>
            </section>
          )}
          {tab === 'orders' && (
            <>
              <div className="admin-toolbar">
                <h2>
                  订单列表 <span className="count-tag">{orders.length}</span>
                </h2>
                <select
                  aria-label="订单状态筛选"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">全部状态</option>
                  <option value="PENDING">待确认</option>
                  <option value="CONFIRMED">已确认</option>
                  <option value="COMPLETED">已完成</option>
                  <option value="CANCELLED">已取消</option>
                </select>
              </div>
              <div className="orders-list">
                {orders
                  .filter((o) => !status || o.status === status)
                  .map((o) => (
                    <OrderCard key={o.id} order={o}>
                      <div className="row-actions">
                        {(o.status === 'PENDING'
                          ? ['CONFIRMED', 'CANCELLED']
                          : o.status === 'CONFIRMED'
                            ? ['COMPLETED', 'CANCELLED']
                            : []
                        ).map((next) => (
                          <button
                            key={next}
                            disabled={busy}
                            className={next === 'CANCELLED' ? 'outline-button' : 'primary'}
                            onClick={() => {
                              if (
                                next === 'CANCELLED' &&
                                !window.confirm('确认取消此订单？取消后会恢复商品库存。')
                              )
                                return
                              void operate(
                                () =>
                                  api(`/admin/orders/${o.id}/status`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ status: next as OrderStatus }),
                                  }),
                                '订单状态已更新',
                              )
                            }}
                          >
                            {next === 'CONFIRMED'
                              ? '确认订单'
                              : next === 'COMPLETED'
                                ? '标记完成'
                                : '取消订单'}
                          </button>
                        ))}
                      </div>
                    </OrderCard>
                  ))}
              </div>
              {!orders.filter((o) => !status || o.status === status).length && (
                <Empty title="暂时没有此类订单" detail="访客提交的预订会显示在这里。" />
              )}
            </>
          )}
          {tab === 'prices' && (
            <>
              <section className="admin-panel">
                <div className="section-heading">
                  <div>
                    <h2>批量更新商品价格与库存</h2>
                    <p className="muted">按款号匹配商品，整批验证，失败时不会部分写入。</p>
                  </div>
                  <a className="outline-button" href="/api/admin/prices/template" download>
                    下载 CSV 模板
                  </a>
                </div>
                <div className="import-area">
                  <Icon name="upload" size={32} />
                  <div>
                    <strong>上传价格表</strong>
                    <p>UTF-8 CSV · 表头 sku,price,stock · 最多 1000 行 / 512 KB</p>
                    <input
                      key={csvVersion}
                      aria-label="选择价格 CSV"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setCsv(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <button
                    className="primary"
                    disabled={!csv || busy}
                    onClick={() => {
                      if (!csv) return
                      const body = new FormData()
                      body.append('file', csv)
                      void operate(async () => {
                        const result = await api<{ updated: number }>('/admin/prices/import', {
                          method: 'POST',
                          body,
                        })
                        setCsv(null)
                        setCsvVersion((v) => v + 1)
                        return result
                      }, '价格与库存已批量更新')
                    }}
                  >
                    {busy ? '处理中…' : '导入并更新'}
                  </button>
                </div>
              </section>
              <section className="admin-panel">
                <div className="section-heading">
                  <div>
                    <h2>材质参考金价</h2>
                    <p className="muted">仅更新报价看板，不自动重算商品售价。</p>
                  </div>
                  <a href="#/prices">查看前台 ↗</a>
                </div>
                <div className="gold-editor-list">
                  {prices.map((p) => (
                    <form
                      key={p.material + p.updatedAt}
                      onSubmit={(e) => {
                        e.preventDefault()
                        const form = new FormData(e.currentTarget)
                        void operate(
                          () =>
                            api(`/admin/prices/${encodeURIComponent(p.material)}`, {
                              method: 'PUT',
                              body: JSON.stringify({
                                price: Number(form.get('price')),
                                source: form.get('source'),
                              }),
                            }),
                          '参考金价已更新',
                        )
                      }}
                    >
                      <strong>{p.material}</strong>
                      <label>
                        元 / 克
                        <input
                          name="price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          max="999999999.99"
                          defaultValue={p.price}
                          required
                        />
                      </label>
                      <label>
                        报价来源
                        <input name="source" defaultValue={p.source} maxLength={100} required />
                      </label>
                      <button className="outline-button" disabled={busy}>
                        保存
                      </button>
                    </form>
                  ))}
                </div>
              </section>
            </>
          )}
          {tab === 'store' && store && (
            <section className="admin-panel settings-panel">
              <h2>店铺公开信息</h2>
              <p className="muted">这些信息将展示在首页和“联系店铺”中。</p>
              <form
                key={JSON.stringify(store)}
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = new FormData(e.currentTarget)
                  void operate(
                    () =>
                      api('/admin/store', {
                        method: 'PUT',
                        body: JSON.stringify(Object.fromEntries(form)),
                      }),
                    '店铺信息已保存',
                  )
                }}
              >
                <label>
                  店铺名称
                  <input name="name" defaultValue={store.name} maxLength={60} required />
                </label>
                <label>
                  店铺标语
                  <input name="tagline" defaultValue={store.tagline} maxLength={160} required />
                </label>
                <div className="form-grid">
                  <label>
                    联系电话
                    <input
                      name="phone"
                      defaultValue={store.phone}
                      maxLength={30}
                      placeholder="填写真实店铺联系电话"
                    />
                  </label>
                  <label>
                    微信号
                    <input name="wechat" defaultValue={store.wechat} maxLength={80} />
                  </label>
                </div>
                <label>
                  首页公告
                  <textarea name="notice" defaultValue={store.notice} maxLength={300} rows={4} />
                </label>
                <button className="primary" disabled={busy}>
                  保存店铺设置
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
      {editing && (
        <ProductEditor
          product={editing === 'new' ? undefined : editing}
          close={() => setEditing(null)}
          saved={async () => {
            setEditing(null)
            await load()
            await refreshStore()
            notify('商品已保存')
          }}
        />
      )}
    </div>
  )
}

const blankProduct: ProductInput = {
  sku: '',
  name: '',
  category: '戒指',
  material: '足金999.9',
  price: 0,
  weightMin: 0,
  weightMax: 0,
  laborFee: 0,
  stock: 0,
  imageUrl: '',
  imageCrop: '',
  description: '',
  featured: false,
  fresh: true,
  active: true,
}
function ProductEditor({
  product,
  close,
  saved,
}: {
  product?: Product
  close: () => void
  saved: () => Promise<void>
}) {
  const [form, setForm] = useState<ProductInput>(product ?? blankProduct)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  // keyof 表示 DTO 的字段名联合；泛型 K 让字段名与值类型保持对应关系。
  const update = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))
  async function upload(file?: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('图片不能超过 5 MB')
      return
    }
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const result = await api<{ imageUrl: string }>('/admin/uploads', { method: 'POST', body })
      setForm((current) => ({ ...current, imageUrl: result.imageUrl, imageCrop: '' }))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.imageUrl) {
      setError('请先上传商品图片')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api(product ? `/admin/products/${product.id}` : '/admin/products', {
        method: product ? 'PUT' : 'POST',
        body: JSON.stringify(form),
      })
      await saved()
    } catch (e2) {
      setError(errorMessage(e2))
      setBusy(false)
    }
  }
  return (
    <Modal
      title={product ? '编辑商品' : '新增商品'}
      close={() => {
        if (!busy) close()
      }}
      wide
    >
      <form className="product-editor form-stack" onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="editor-image-row">
            {form.imageUrl ? (
              <ProductImage {...form} />
            ) : (
              <div className="image-placeholder">
                <Icon name="diamond" size={32} />
              </div>
            )}
            <div>
              <strong>商品主图</strong>
              <p className="muted">上传 JPEG / PNG，建议方图，最大 5 MB。</p>
              <input
                type="file"
                aria-label="上传商品主图"
                accept="image/jpeg,image/png"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="form-grid">
            <label>
              商品名称
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </label>
            <label>
              商品款号
              <input
                required
                pattern="[A-Za-z0-9_\-]{2,48}"
                maxLength={48}
                value={form.sku}
                onChange={(e) => update('sku', e.target.value)}
                placeholder="字母、数字、下划线或横线"
              />
            </label>
            <label>
              分类
              <select value={form.category} onChange={(e) => update('category', e.target.value)}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              材质
              <input
                required
                maxLength={32}
                value={form.material}
                onChange={(e) => update('material', e.target.value)}
              />
            </label>
            {(
              [
                ['price', '商品售价（元）', '0.01', '0.01', '999999999.99'],
                ['stock', '现货库存（件）', '0', '1', '999999'],
                ['weightMin', '最小克重（g）', '0', '0.001', '999999.999'],
                ['weightMax', '最大克重（g）', '0', '0.001', '999999.999'],
                ['laborFee', '参考工费（元/g）', '0', '0.01', '99999999.99'],
              ] as const
            ).map(([key, label, min, step, max]) => (
              <label key={key}>
                {label}
                <input
                  required
                  type="number"
                  min={min}
                  step={step}
                  max={max}
                  value={form[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <label>
            商品说明
            <textarea
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </label>
          <div className="checkbox-row">
            {(
              [
                ['featured', '人气精选'],
                ['fresh', '新品推荐'],
                ['active', '立即上架'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => update(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="outline-button" disabled={busy} onClick={close}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            {busy ? '处理中…' : '保存商品'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
