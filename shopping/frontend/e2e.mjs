// 使用独立的内存数据库启动 Java，然后从真实 Chrome 点击页面，验证前后端联动。
// pnpm e2e；电脑需安装 Chrome，或使用 CHROME_PATH / pnpm exec playwright install chromium。
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const artifacts = path.join(root, 'artifacts')
await mkdir(artifacts, { recursive: true })
const data = path.join(artifacts, `e2e-${Date.now()}`)
await mkdir(data, { recursive: true })
const jar = path.join(root, 'backend/target/shopping-1.0.0.jar')
assert.ok(existsSync(jar), '请先运行 build.ps1 构建 JAR')
const base = 'http://127.0.0.1:18091'
try { await fetch(`${base}/api/products`); throw new Error('测试端口 18091 被占用') }
catch (error) { if (error.message === '测试端口 18091 被占用') throw error }
const log = createWriteStream(path.join(data, 'server.log'))
const java = spawn('java', ['-Djdk.net.unixdomain.tmpdir=.', '-jar', jar, '--server.port=18091', '--server.address=127.0.0.1',
  `--shop.data-dir=${data.replaceAll('\\', '/')}`,
  '--spring.datasource.url=jdbc:h2:mem:browser-test;DB_CLOSE_DELAY=-1'],
  { cwd: path.join(root, 'backend'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
java.stdout.pipe(log); java.stderr.pipe(log)
let browser
const errors = []
const consoleErrors = []
try {
  for (let i=0; i<80; i++) {
    if(java.exitCode !== null) throw new Error('Java 测试服务启动失败，查看 artifacts 中的日志')
    try { if((await fetch(`${base}/api/products`)).ok) break } catch { /* 等待 HTTP 服务就绪 */ }
    if(i===79) throw new Error('服务启动超时')
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  const password = (await readFile(path.join(data,'admin-password.txt'),'utf8')).trim()
  const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  browser = await chromium.launch({headless:true, ...(existsSync(chrome)?{executablePath:chrome}:{})})
  const context = await browser.newContext({viewport:{width:1440,height:1050}})
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('401'))consoleErrors.push(message.text())})
  const screenshot = async name => { await page.screenshot({path:path.join(artifacts,name),fullPage:true}) }
  const noOverflow = async () => assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'页面发生横向溢出')
  const goto = async route => {await page.goto(`${base}/#${route}`);await page.locator('.loading').waitFor({state:'hidden'})}
  const products = async () => (await context.request.get(`${base}/api/products`)).json()
  await goto('/')
  await page.getByRole('heading',{name:'遇见你的心动款'}).waitFor()
  await screenshot('desktop-home.png'); await noOverflow()

  // 搜索、筛选、购物车刷新保留，再以访客身份下单。
  await page.getByLabel('搜索商品',{exact:true}).fill('BFWJZ10049')
  await page.getByRole('button',{name:'开始搜索'}).click()
  await page.waitForFunction(()=>document.querySelectorAll('.product-card').length===1)
  await page.locator('.product-name').click()
  await page.getByRole('button',{name:'加入购物车',exact:true}).click()
  await goto('/cart'); await page.getByRole('button',{name:'增加数量',exact:true}).click()
  await page.reload(); await page.getByRole('button',{name:'填写收货信息'}).click()
  await page.getByLabel('收货人',{exact:true}).fill('浏览器测试访客')
  await page.getByLabel('联系电话',{exact:true}).fill('13800000000')
  await page.getByLabel('收货地址',{exact:true}).fill('测试市测试区测试街道 1 号')
  await page.getByLabel('订单备注',{exact:true}).fill('端到端测试，不是真实订单')
  await page.getByRole('button',{name:/提交预订/}).click()
  await page.locator('.order-card').waitFor()
  const ownOrders = await (await context.request.get(`${base}/api/orders`)).json()
  assert.equal(ownOrders.length,1); assert.equal(ownOrders[0].total,5053.62)
  assert.equal((await products()).find(p=>p.id===1).stock,5)
  const other = await browser.newContext()
  assert.deepEqual(await (await other.request.get(`${base}/api/orders`)).json(),[])
  await other.close()
  console.log('PASS: 搜索、详情、购物车持久化、免登录下单、金额与访客隔离')

  // 真正登录，然后在运营页面编辑售价、上传图片并新建商品。
  await goto('/admin')
  await page.getByLabel('登录密码').fill(password)
  await page.getByRole('button',{name:'登录工作台'}).click()
  await page.getByRole('heading',{name:'运营概览',exact:true}).waitFor()
  await screenshot('desktop-admin.png')
  await page.getByRole('button',{name:'商品管理',exact:true}).click()
  await page.getByLabel('搜索后台商品').fill('BFWJZ10049')
  await page.getByRole('button',{name:'编辑',exact:true}).click()
  await page.getByLabel('商品售价（元）',{exact:true}).fill('2599.99')
  await page.getByRole('button',{name:'保存商品',exact:true}).click()
  await page.locator('dialog').waitFor({state:'hidden'})
  assert.equal((await products()).find(p=>p.id===1).price,2599.99)
  await page.getByRole('button',{name:'＋ 新增商品',exact:true}).click()
  await page.getByLabel('上传商品主图').setInputFiles(path.join(root,'frontend/public/reference/9.jpg'))
  await page.locator('dialog .product-image img').waitFor()
  await page.getByLabel('商品名称',{exact:true}).fill('浏览器上传测试商品')
  await page.getByLabel('商品款号',{exact:true}).fill('E2E_TEST_001')
  await page.getByLabel('商品售价（元）',{exact:true}).fill('388.88')
  await page.getByLabel('现货库存（件）',{exact:true}).fill('20')
  await page.getByRole('button',{name:'保存商品',exact:true}).click()
  await page.locator('dialog').waitFor({state:'hidden'})
  const added = (await products()).find(p=>p.sku==='E2E_TEST_001')
  assert.ok(added.imageUrl.startsWith('/uploads/'));assert.equal(added.price,388.88)
  assert.equal((await context.request.get(`${base}${added.imageUrl}`)).status(),200)
  await page.getByLabel('搜索后台商品').fill('E2E_TEST_001')
  await page.getByRole('button',{name:'下架',exact:true}).click()
  await page.getByRole('button',{name:'上架',exact:true}).waitFor()
  assert.ok(!(await products()).some(p=>p.sku==='E2E_TEST_001'))

  await page.getByRole('button',{name:'价格与导入',exact:true}).click()
  const csvFile = path.join(data,'prices.csv')
  await writeFile(csvFile,'\uFEFFsku,price,stock\nBFWJZ10049,2699.99,5\n','utf8')
  await page.getByLabel('选择价格 CSV').setInputFiles(csvFile)
  await page.getByRole('button',{name:'导入并更新',exact:true}).click()
  await page.getByRole('status').filter({hasText:'价格与库存已批量更新'}).waitFor()
  assert.equal((await products()).find(p=>p.id===1).price,2699.99)
  const goldRow = page.locator('.gold-editor-list form').filter({has:page.locator('strong').filter({hasText:/^足金999$/})})
  await goldRow.getByLabel('元 / 克').fill('1000.01')
  await goldRow.getByLabel('报价来源').fill('浏览器测试报价')
  await goldRow.getByRole('button',{name:'保存',exact:true}).click()
  await page.getByRole('status').filter({hasText:'参考金价已更新'}).waitFor()
  assert.equal((await (await context.request.get(`${base}/api/prices`)).json()).find(p=>p.material==='足金999').price,1000.01)

  await page.getByRole('button',{name:/^订单管理/}).click()
  await page.getByRole('button',{name:'确认订单',exact:true}).click()
  await page.getByRole('button',{name:'标记完成',exact:true}).waitFor()
  page.once('dialog',dialog=>dialog.accept())
  await page.getByRole('button',{name:'取消订单',exact:true}).click()
  await page.locator('.order-card .status-badge').filter({hasText:'已取消'}).waitFor()
  assert.equal((await products()).find(p=>p.id===1).stock,7)
  await page.getByRole('button',{name:'店铺设置',exact:true}).click()
  await page.getByLabel('店铺标语').fill('测试标语：把时光戴在身上。')
  await page.getByRole('button',{name:'保存店铺设置'}).click()
  await page.getByRole('status').filter({hasText:'店铺信息已保存'}).waitFor()
  console.log('PASS: 真实登录、调价、图片上传、新增上下架、CSV 导入、金价、订单确认取消、库存恢复、店铺设置')

  // 移动端主要页面和后台布局不应撑破 viewport。
  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:'运营概览',exact:true}).click();await screenshot('mobile-admin.png');await noOverflow()
  await page.getByRole('button',{name:'商品管理',exact:true}).click();await noOverflow()
  await goto('/');await page.getByRole('heading',{name:'遇见你的心动款'}).waitFor()
  await screenshot('mobile-home.png');await noOverflow()
  await page.screenshot({path:path.join(artifacts,'mobile-home-viewport.png')})
  await page.locator('.store-footer p').filter({hasText:'测试标语：把时光戴在身上。'}).waitFor()
  await goto('/catalog');await page.locator('.product-card').first().waitFor();await noOverflow()
  await page.getByLabel('价格排序').selectOption('price-low')
  assert.ok((await page.locator('.product-name').first().textContent()).includes('小马'))
  await screenshot('mobile-catalog.png')
  await goto('/product/1');await page.getByRole('button',{name:'加入购物车',exact:true}).waitFor()
  await screenshot('mobile-detail.png');await noOverflow()
  await page.getByRole('button',{name:'加入购物车',exact:true}).click()
  await goto('/cart');await page.getByRole('button',{name:'填写收货信息'}).waitFor();await noOverflow()
  await screenshot('mobile-cart.png')
  await goto('/mine');await page.locator('.order-card').waitFor();await noOverflow()
  await goto('/prices');await page.locator('.prices-card').waitFor();await noOverflow()
  await goto('/admin');await page.getByRole('button',{name:'退出登录'}).click()
  await page.getByRole('heading',{name:'欢迎回到商家工作台'}).waitFor()
  assert.equal((await context.request.get(`${base}/api/admin/products`)).status(),401)
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[])
  console.log('PASS: 手机布局、筛选排序、退出登录、无 JS 异常')
  await writeFile(path.join(artifacts,'browser-results.json'),JSON.stringify({passed:true,testedAt:new Date().toISOString(),viewport:[1440,390],errors,consoleErrors},null,2))
} finally {
  if(browser)await browser.close()
  java.kill();log.end()
}
