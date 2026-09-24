import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from './api'
import { categories, dateText, money, statusLabels } from './types'
import type { CartLine, GoldPrice, Product, ShopOrder, Store } from './types'
import { Empty, Icon, Modal, OrderCard, ProductCard, ProductImage } from './components'
import Admin from './Admin'

// 以 use 开头的是自定义 Hook。把浏览器 hash 转为 React 状态，组件才能随地址变化重绘。
function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(1) || '/')
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || '/')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  return new URL(route, location.origin)
}

function readCart(): CartLine[] {
  // localStorage 的内容可能被修改或损坏，不能只写 as CartLine[] 就信任它。
  try {
    const value: unknown = JSON.parse(localStorage.getItem('shopping-cart-v1') || '[]')
    if (!Array.isArray(value)) return []
    return value
      .filter(
        (v): v is CartLine =>
          typeof v === 'object' &&
          v !== null &&
          Number.isSafeInteger(v.productId) &&
          v.productId > 0 &&
          Number.isInteger(v.quantity) &&
          v.quantity > 0 &&
          v.quantity <= 99,
      )
      .slice(0, 50)
  } catch {
    return []
  }
}

export default function App() {
  const route = useRoute()
  // 数组解构：products 是当前数据，setProducts 是更新入口；泛型约束数组中的 DTO 类型。
  const [products, setProducts] = useState<Product[]>([])
  const [store, setStore] = useState<Store | null>(null)
  const [prices, setPrices] = useState<GoldPrice[]>([])
  const [error, setError] = useState('')
  // 传函数而非 readCart()，使读取 localStorage 成为 useState 的懒初始化逻辑。
  const [cart, setCart] = useState<CartLine[]>(readCart)
  const [toast, setToast] = useState('')
  const [contact, setContact] = useState(false)
  // useCallback 保持函数引用稳定；三个独立 GET 用 Promise.all 并行等待，再统一更新状态。
  const refresh = useCallback(async () => {
    const [p, s, g] = await Promise.all([
      api<Product[]>('/products'),
      api<Store>('/store'),
      api<GoldPrice[]>('/prices'),
    ])
    setProducts(p)
    setStore(s)
    setPrices(g)
    setError('')
  }, [])
  useEffect(() => {
    // 路径变化后更新数据，以便看到后台刚修改的价格或取消后恢复的库存。
    void refresh().catch((e) => setError(errorMessage(e)))
  }, [refresh, route.pathname])
  useEffect(() => {
    try {
      localStorage.setItem('shopping-cart-v1', JSON.stringify(cart))
    } catch {
      setToast('浏览器存储不可用，本次购物车仅在当前页面保留')
    }
  }, [cart])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  function add(product: Product) {
    const existing = cart.find((line) => line.productId === product.id)?.quantity ?? 0
    if (existing >= Math.min(product.stock, 99)) {
      setToast('已达到当前库存或单件购买上限')
      return
    }
    // 函数式更新基于最新状态，map 和展开语法产生新数组，不直接修改 React 状态。
    setCart((current) =>
      current.some((line) => line.productId === product.id)
        ? current.map((line) =>
            line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...current, { productId: product.id, quantity: 1 }],
    )
    setToast('已加入购物车')
  }
  // reduce 的最后一个参数 0 是累加初始值，作用类似 Stream.mapToInt(...).sum()。
  const count = cart.reduce((sum, line) => sum + line.quantity, 0)
  const admin = route.pathname === '/admin'
  return (
    <>
      {admin ? (
        <Admin refreshStore={refresh} notify={setToast} />
      ) : (
        <>
          <div className="announcement">
            <span>每一份心意，都值得被珍藏</span>
            <span>
              访客自由选购 · 商家确认订单 <i> / </i>
              <a href="#/admin">商家工作台 ↗</a>
            </span>
          </div>
          <Header route={route.pathname} store={store} count={count} />
          <main className="store-main">
            {error ? (
              <div className="error-panel" role="alert">
                <strong>暂时无法连接商店</strong>
                <p>{error}</p>
                <button
                  className="primary"
                  onClick={() => void refresh().catch((e) => setError(errorMessage(e)))}
                >
                  重新加载
                </button>
              </div>
            ) : !store ? (
              <div className="loading">正在为你整理珍藏好物…</div>
            ) : route.pathname === '/' ? (
              <Home
                products={products}
                store={store}
                prices={prices}
                add={add}
                contact={() => setContact(true)}
              />
            ) : ['/catalog', '/new', '/hot'].includes(route.pathname) ? (
              <Catalog key={route.href} route={route} products={products} add={add} />
            ) : route.pathname.startsWith('/product/') ? (
              <Detail
                product={products.find((p) => p.id === Number(route.pathname.split('/')[2]))}
                products={products}
                add={add}
                contact={() => setContact(true)}
              />
            ) : route.pathname === '/cart' ? (
              <Cart
                cart={cart}
                products={products}
                setCart={setCart}
                refresh={refresh}
                notify={setToast}
              />
            ) : route.pathname === '/mine' ? (
              <Mine contact={() => setContact(true)} />
            ) : route.pathname === '/prices' ? (
              <Prices prices={prices} />
            ) : (
              <Empty title="页面不存在" detail="换一个入口，继续发现喜欢的珠宝。">
                <a className="primary" href="#/">
                  回到首页
                </a>
              </Empty>
            )}
          </main>
          <footer className="store-footer">
            <div className="brand small">
              <Icon name="diamond" size={28} />
              <span>{store?.name || '拾光珠宝'}</span>
            </div>
            <p>
              {store?.tagline || '把日常，戴成珍藏。'}
              <br />
              <small>演示商城 · 参考图片来自用户提供的素材 · 未接入在线支付</small>
            </p>
            <a href="#/admin">
              运营管理 <Icon name="arrow" size={15} />
            </a>
          </footer>
          <nav className="mobile-nav" aria-label="手机底部导航">
            {[
              ['/', 'home', '首页'],
              ['/hot', 'flame', '热门榜'],
              ['/cart', 'cart', '购物车'],
              ['/mine', 'user', '我的订单'],
            ].map(([path, icon, label]) => (
              <a key={path} href={`#${path}`} className={route.pathname === path ? 'active' : ''}>
                <span>
                  <Icon name={icon} />
                  {path === '/cart' && count > 0 && <b>{count}</b>}
                </span>
                {label}
              </a>
            ))}
          </nav>
          {contact && (
            <Modal title="联系店铺" close={() => setContact(false)}>
              <div className="contact-card">
                <Icon name="phone" size={35} />
                <h3>{store?.name}</h3>
                <p>预订确认、商品细节与售后咨询</p>
                {store?.phone ? (
                  <a className="primary" href={`tel:${store.phone}`}>
                    拨打 {store.phone}
                  </a>
                ) : (
                  <p className="notice">商家暂未配置联系电话，可在运营后台的“店铺设置”中填写。</p>
                )}
                {store?.wechat && (
                  <p>
                    微信：<strong>{store.wechat}</strong>
                  </p>
                )}
              </div>
            </Modal>
          )}
        </>
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
        </div>
      )}
    </>
  )
}

function Header({ route, store, count }: { route: string; store: Store | null; count: number }) {
  const [search, setSearch] = useState('')
  return (
    <header className="store-header">
      <div className="header-inner">
        <a className="brand" href="#/">
          <span className="brand-symbol">
            <Icon name="diamond" size={31} />
          </span>
          <span>
            {store?.name || '拾光珠宝'}
            <small>SHIGUANG JEWELRY</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="主导航">
          {[
            ['/', '首页'],
            ['/catalog', '全部珠宝'],
            ['/new', '新品上市'],
            ['/hot', '人气精选'],
            ['/prices', '今日金价'],
          ].map(([path, label]) => (
            <a className={route === path ? 'active' : ''} key={path} href={`#${path}`}>
              {label}
            </a>
          ))}
        </nav>
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault()
            location.hash = `/catalog?q=${encodeURIComponent(search.trim())}`
          }}
        >
          <Icon name="search" size={18} />
          <input
            aria-label="搜索商品"
            placeholder="搜索款式、材质、款号"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" aria-label="开始搜索">
            <Icon name="arrow" size={17} />
          </button>
        </form>
        <div className="header-actions">
          <a href="#/mine" aria-label="我的订单">
            <Icon name="user" />
          </a>
          <a href="#/cart" aria-label={`购物车，${count} 件商品`}>
            <Icon name="bag" />
            {count > 0 && <b>{count}</b>}
          </a>
        </div>
      </div>
    </header>
  )
}

function Home({
  products,
  store,
  prices,
  add,
  contact,
}: {
  products: Product[]
  store: Store
  prices: GoldPrice[]
  add: (p: Product) => void
  contact: () => void
}) {
  const hero = products.find((p) => p.imageCrop === 'leaf') ?? products[0]
  const gold = prices.find((p) => p.material === '足金999')
  return (
    <>
      <div className="category-strip">
        <a className="selected" href="#/catalog">
          全部品类
        </a>
        {categories.map((c) => (
          <a key={c} href={`#/catalog?category=${encodeURIComponent(c)}`}>
            {c}
          </a>
        ))}
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> EVERYDAY, A LITTLE GOLD
          </div>
          <h1>
            把日常，
            <br />
            戴成<span>珍藏。</span>
          </h1>
          <p>
            古法的温度，现代的轻盈。
            <br />
            为自己，也为每一个值得纪念的时刻。
          </p>
          <a className="hero-button" href="#/new">
            探索本季新品 <Icon name="arrow" size={19} />
          </a>
          <div className="hero-footnote">
            <span>2026 / AUTUMN</span>
            <i />
            <span>THE GOLDEN EDIT · 秋日精选</span>
          </div>
        </div>
        <a
          href={hero ? `#/product/${hero.id}` : '#/catalog'}
          className="hero-visual"
          aria-label="查看本季精选"
        >
          <div className="hero-orbit" />
          {hero && <ProductImage {...hero} />}
          <span className="hero-stamp">
            GOLD
            <br />
            <em>is a feeling.</em>
          </span>
          <div className="hero-caption">
            <span>本季灵感 · 一叶知秋</span>
            <strong>以细节，回应心动。</strong>
            <span>
              探索更多 <Icon name="arrow" size={16} />
            </span>
          </div>
        </a>
      </section>
      <section className="store-service-row">
        <div>
          <Icon name="diamond" />
          <span>
            甄选珠宝<small>多种材质与工艺</small>
          </span>
        </div>
        <div>
          <Icon name="bag" />
          <span>
            免登录选购<small>轻松提交预订</small>
          </span>
        </div>
        <button onClick={contact}>
          <Icon name="phone" />
          <span>
            联系店铺<small>商品与售后咨询</small>
          </span>
        </button>
        <a href="#/prices" className="gold-ticker">
          <span>
            商家参考金价<small>非实时行情</small>
          </span>
          <strong>
            ¥{gold ? money(gold.price) : '—'}
            <small>/g</small>
          </strong>
          <Icon name="arrow" size={18} />
        </a>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FIND YOUR EVERYDAY FAVORITE</div>
            <h2>遇见你的心动款</h2>
          </div>
          <a href="#/catalog">
            浏览全部珠宝 <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="category-cards">
          {[
            ['戒指', 'leaf', '指间，藏一点浪漫'],
            ['手镯', 'bamboo', '腕间，自有光芒'],
            ['吊坠', 'pendant', '心意，贴近一点'],
            ['耳饰', 'earrings', '细节，让日常闪耀'],
          ].map(([category, crop, phrase]) => {
            const item = products.find((p) => p.imageCrop === crop)
            return (
              <a
                key={category}
                href={`#/catalog?category=${encodeURIComponent(category)}`}
                className="category-card"
              >
                <div>
                  <h3>{category}</h3>
                  <p>{phrase}</p>
                  <span>
                    {products.filter((p) => p.category === category).length} 款精选{' '}
                    <Icon name="arrow" size={14} />
                  </span>
                </div>
                {item && <ProductImage {...item} />}
              </a>
            )
          })}
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CURATED FOR YOU</div>
            <h2>
              人气珍藏 <span className="count-tag">编辑精选</span>
            </h2>
          </div>
          <a href="#/hot">
            查看热门榜 <Icon name="arrow" size={17} />
          </a>
        </div>
        <div className="product-grid">
          {products
            .filter((p) => p.featured)
            .slice(0, 8)
            .map((p) => (
              <ProductCard key={p.id} product={p} add={add} />
            ))}
        </div>
      </section>
      <section className="editorial-banner">
        <div>
          <div className="eyebrow">A GIFT THAT TELLS A STORY</div>
          <h2>把爱意，认真收藏。</h2>
          <p>一份礼物，一段故事。让心意找到刚刚好的表达。</p>
        </div>
        <a className="outline-button" href="#/catalog?category=礼品">
          挑选一份心意 <Icon name="arrow" size={18} />
        </a>
      </section>
      <p className="demo-note">{store.notice}</p>
    </>
  )
}

// 筛选条件变化时重新计算展示数组；filter 生成新数组，所以后面的 sort 不会改写父组件状态。
function Catalog({
  route,
  products,
  add,
}: {
  route: URL
  products: Product[]
  add: (p: Product) => void
}) {
  const category = route.searchParams.get('category') || ''
  const query = (route.searchParams.get('q') || '').toLowerCase()
  const [sort, setSort] = useState('featured')
  const [material, setMaterial] = useState('')
  const isNew = route.pathname === '/new',
    isHot = route.pathname === '/hot'
  const filtered = products
    .filter(
      (p) =>
        (!category || p.category === category) &&
        (!isNew || p.fresh) &&
        (!isHot || p.featured) &&
        (!material || p.material === material) &&
        `${p.name} ${p.sku} ${p.material}`.toLowerCase().includes(query),
    )
    .sort((a, b) =>
      sort === 'price-low'
        ? a.price - b.price
        : sort === 'price-high'
          ? b.price - a.price
          : Number(b.featured) - Number(a.featured) || b.id - a.id,
    )
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">THE JEWELRY COLLECTION</div>
        <h1>{isNew ? '新品，初见心动' : isHot ? '人气榜单 · 值得珍藏' : category || '全部珠宝'}</h1>
        <p>{query ? `“${query}” 的搜索结果` : '从一枚戒指开始，找到属于自己的光。'}</p>
      </div>
      <div className="catalog-toolbar">
        <div className="filter-chips">
          <a className={!category ? 'active' : ''} href={`#${route.pathname}`}>
            全部
          </a>
          {categories.map((c) => (
            <a
              className={category === c ? 'active' : ''}
              key={c}
              href={`#${route.pathname}?category=${encodeURIComponent(c)}`}
            >
              {c}
            </a>
          ))}
        </div>
        <div className="sort-tools">
          <span>{filtered.length} 件商品</span>
          <select
            aria-label="材质筛选"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          >
            <option value="">所有材质</option>
            {[...new Set(products.map((p) => p.material))].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select aria-label="价格排序" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">推荐排序</option>
            <option value="price-low">价格从低到高</option>
            <option value="price-high">价格从高到低</option>
          </select>
        </div>
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} add={add} />
          ))}
        </div>
      ) : (
        <Empty title="还没有找到合适的款式" detail="试试其他关键词，或切换分类与材质。">
          <a href="#/catalog" className="primary">
            查看全部商品
          </a>
        </Empty>
      )}
    </>
  )
}

function Detail({
  product: p,
  products,
  add,
  contact,
}: {
  product?: Product
  products: Product[]
  add: (p: Product) => void
  contact: () => void
}) {
  if (!p)
    return (
      <Empty title="商品已下架或不存在" detail="去看看其他喜欢的款式。">
        <a className="primary" href="#/catalog">
          继续选购
        </a>
      </Empty>
    )
  return (
    <>
      <div className="breadcrumbs">
        <a href="#/">首页</a>
        <span>/</span>
        <a href={`#/catalog?category=${p.category}`}>{p.category}</a>
        <span>/</span>
        {p.sku}
      </div>
      <section className="product-detail">
        <ProductImage {...p} className="detail-photo" />
        <div className="detail-info">
          <div className="eyebrow">SHIGUANG · 精选珠宝</div>
          <div className="tag-row">
            <span className="material-tag">{p.material}</span>
            {p.fresh && <span className="material-tag">本季新品</span>}
          </div>
          <h1>{p.name}</h1>
          <p className="detail-story">以一抹金色，点亮平凡却独特的每一天。</p>
          <div className="detail-price">
            ¥<strong>{money(p.price)}</strong>
            <span>/ 件</span>
          </div>
          <div className="detail-specs">
            <div>
              商品款号<strong>{p.sku}</strong>
            </div>
            <div>
              参考克重
              <strong>{p.weightMin > 0 ? `${p.weightMin} – ${p.weightMax} g` : '按件销售'}</strong>
            </div>
            <div>
              参考工费<strong>¥{money(p.laborFee)} / g</strong>
            </div>
            <div>
              现货库存<strong>{p.stock} 件</strong>
            </div>
          </div>
          <p className="detail-description">{p.description}</p>
          <div className="detail-actions">
            <button className="primary" disabled={p.stock === 0} onClick={() => add(p)}>
              <Icon name="bag" />
              {p.stock ? '加入购物车' : '暂时售罄'}
            </button>
            <button className="outline-button" onClick={contact}>
              咨询店铺
            </button>
          </div>
          <small className="muted">商品价格为后台维护的单件报价；订单提交后由商家确认。</small>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <h2>你可能也会喜欢</h2>
          <a href="#/catalog">更多款式 →</a>
        </div>
        <div className="product-grid">
          {products
            .filter((other) => other.id !== p.id)
            .slice(0, 4)
            .map((other) => (
              <ProductCard key={other.id} product={other} add={add} />
            ))}
        </div>
      </section>
    </>
  )
}

interface CartProps {
  cart: CartLine[]
  products: Product[]
  setCart: (value: CartLine[] | ((current: CartLine[]) => CartLine[])) => void
  refresh: () => Promise<void>
  notify: (text: string) => void
}
function Cart({ cart, products, setCart, refresh, notify }: CartProps) {
  const [checkout, setCheckout] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lines = cart.map((line) => ({
    ...line,
    product: products.find((p) => p.id === line.productId),
  }))
  // 这里的金额仅作页面预览，后端下单时从数据库重新计算。
  const total = lines.reduce((sum, line) => sum + (line.product?.price ?? 0) * line.quantity, 0)
  const invalid = lines.some((line) => !line.product || line.quantity > (line.product?.stock ?? 0))
  function quantity(id: number, value: number) {
    setCart((current) =>
      current.map((line) => (line.productId === id ? { ...line, quantity: value } : line)),
    )
  }
  // FormEvent 给 event.currentTarget 标注 HTMLFormElement，读取的是这次提交的表单。
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await api<ShopOrder>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: form.get('customerName'),
          phone: form.get('phone'),
          address: form.get('address'),
          note: form.get('note'),
          items: cart,
        }),
      })
      setCart([])
      setCheckout(false)
      notify('订单已提交，等待商家联系确认')
      location.hash = '/mine'
      await refresh().catch(() => undefined)
    } catch (e) {
      setError(errorMessage(e))
      await refresh().catch(() => undefined)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">YOUR LITTLE COLLECTION</div>
        <h1>
          购物车{' '}
          <span className="count-tag">{cart.reduce((sum, c) => sum + c.quantity, 0)} 件心动</span>
        </h1>
        <p>把喜欢留在这里，把心意带回家。</p>
      </div>
      {!cart.length ? (
        <Empty title="购物车里，还差一点心动" detail="去挑选一件属于自己的珍藏吧。">
          <a className="primary" href="#/catalog">
            去逛逛 <Icon name="arrow" size={18} />
          </a>
        </Empty>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {lines.map(({ product: p, ...line }) => (
              <article className="cart-item" key={line.productId}>
                {p ? (
                  <ProductImage {...p} />
                ) : (
                  <div className="missing-image">
                    <Icon name="bag" />
                  </div>
                )}
                <div className="cart-item-info">
                  <span className="muted">{p?.material || '商品不可用'}</span>
                  <h3>{p?.name || `商品 #${line.productId} 已下架`}</h3>
                  <p>
                    {p?.sku} <span className="muted">库存 {p?.stock ?? 0}</span>
                  </p>
                  <strong>¥{money(p?.price ?? 0)}</strong>
                  {(!p || line.quantity > p.stock) && (
                    <p className="field-error">库存不足或已下架，请调整后提交</p>
                  )}
                </div>
                <div className="cart-item-controls">
                  <div className="stepper">
                    <button
                      aria-label="减少数量"
                      disabled={line.quantity <= 1}
                      onClick={() => quantity(line.productId, line.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      aria-label="增加数量"
                      disabled={!p || line.quantity >= Math.min(p.stock, 99)}
                      onClick={() => quantity(line.productId, line.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="text-button muted"
                    onClick={() =>
                      setCart((current) => current.filter((c) => c.productId !== line.productId))
                    }
                  >
                    移除
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="order-summary">
            <div className="eyebrow">ORDER SUMMARY</div>
            <h2>订单预览</h2>
            <div>
              <span>商品合计</span>
              <strong>¥{money(total)}</strong>
            </div>
            <div>
              <span>配送费用</span>
              <span>联系商家确认</span>
            </div>
            <hr />
            <div className="summary-total">
              <span>预估商品金额</span>
              <strong>¥{money(total)}</strong>
            </div>
            <button className="primary" disabled={invalid} onClick={() => setCheckout(true)}>
              填写收货信息 <Icon name="arrow" size={18} />
            </button>
            <p>免登录提交预订；此处不会扣款，成交与配送事宜由商家联系确认。</p>
          </aside>
        </div>
      )}
      {checkout && (
        <Modal
          title="确认收货信息"
          close={() => {
            if (!busy) setCheckout(false)
          }}
        >
          <form onSubmit={submit} className="form-stack">
            <p className="notice">订单会保存在本浏览器的访客记录中，请保留当前浏览器 Cookie。</p>
            <div className="form-grid">
              <label>
                收货人
                <input
                  name="customerName"
                  required
                  maxLength={40}
                  autoComplete="name"
                  placeholder="怎么称呼你"
                />
              </label>
              <label>
                联系电话
                <input
                  name="phone"
                  required
                  type="tel"
                  minLength={6}
                  maxLength={30}
                  autoComplete="tel"
                  placeholder="用于商家确认订单"
                />
              </label>
            </div>
            <label>
              收货地址
              <textarea
                name="address"
                required
                minLength={5}
                maxLength={300}
                autoComplete="street-address"
                placeholder="省市区、街道和详细地址"
              />
            </label>
            <label>
              订单备注
              <textarea name="note" maxLength={500} placeholder="尺寸、礼物包装等需求（选填）" />
            </label>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? '正在提交…' : `提交预订 · ¥${money(total)}`}
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}

// 解构参数与内联类型：contact 是父组件传来的回调，子组件只调用，不决定弹窗如何实现。
function Mine({ contact }: { contact: () => void }) {
  const [orders, setOrders] = useState<ShopOrder[]>([]),
    [filter, setFilter] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    api<ShopOrder[]>('/orders')
      .then((data) => {
        if (active) setOrders(data)
      })
      .catch((e) => {
        if (active) setError(errorMessage(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <>
      <section className="visitor-banner">
        <div className="visitor-avatar">
          <Icon name="user" size={32} />
        </div>
        <div>
          <div className="eyebrow">WELCOME, JEWELRY LOVER</div>
          <h1>你好，拾光访客</h1>
          <p>不必注册，也能收藏生活里的小美好。</p>
        </div>
        <button className="outline-button" onClick={contact}>
          联系店铺 <Icon name="phone" size={17} />
        </button>
      </section>
      <div className="section-heading">
        <h2>
          我的订单 <span className="count-tag">{orders.length}</span>
        </h2>
        <span className="muted">当前浏览器的访客订单</span>
      </div>
      <div className="filter-chips order-tabs">
        {[['', '全部订单'], ...Object.entries(statusLabels)].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? 'active' : ''}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="loading">正在查询订单…</div>
      ) : orders.filter((o) => !filter || o.status === filter).length === 0 ? (
        <Empty title="这里还没有订单" detail="你的每一次心动，都将在这里留下记录。">
          <a className="primary" href="#/catalog">
            发现心动款式
          </a>
        </Empty>
      ) : (
        <div className="orders-list">
          {orders
            .filter((o) => !filter || o.status === filter)
            .map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
        </div>
      )}
      <p className="demo-note">
        订单仅关联当前浏览器，清除 Cookie
        或更换设备后无法自动找回。请自行保留订单号；需要取消或修改，请联系商家。
      </p>
    </>
  )
}

function Prices({ prices }: { prices: GoldPrice[] }) {
  return (
    <>
      <section className="prices-hero">
        <div className="eyebrow">GOLD PRICE BOARD</div>
        <h1>金色的价值，清晰可见。</h1>
        <p>商家参考报价 · 人工维护，非实时行情</p>
      </section>
      <div className="prices-card">
        <div className="section-heading">
          <h2>材质参考金价</h2>
          <span className="muted">单位：人民币 / 克</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>金属材质</th>
                <th>参考价格</th>
                <th>更新时间</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.material}>
                  <td>
                    <Icon name="diamond" size={17} />
                    {p.material}
                  </td>
                  <td className="price">¥{money(p.price)}</td>
                  <td>{dateText(p.updatedAt)}</td>
                  <td>{p.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="notice">
          此表是商家维护的每克参考价，不自动改动商品售价。实际订单按商品页面的单件报价计算，并由商家确认。
        </p>
      </div>
    </>
  )
}
