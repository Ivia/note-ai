const express = require('express')
const cors = require('cors')
const https = require('https')
const { chromium } = require('playwright')

const app = express()
app.use(cors())
app.use(express.json())

let browser = null

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true })
  }
  return browser
}

function parseCookieString(str) {
  return str.split(';')
    .map(p => p.trim()).filter(Boolean)
    .map(p => {
      const idx = p.indexOf('=')
      return {
        name: p.slice(0, idx).trim(),
        value: p.slice(idx + 1).trim(),
        domain: '.xiaohongshu.com',
        path: '/',
        sameSite: 'Lax',
      }
    })
}

function parseCount(val) {
  if (!val) return 0
  if (typeof val === 'number') return val
  const s = String(val).replace(/,/g, '')
  if (s.includes('万')) return Math.round(parseFloat(s) * 10000)
  return parseInt(s, 10) || 0
}

function extractNotes(json) {
  const data = json?.data
  if (!data) return []
  const list = data.notes || data.user_note_list || data.items || []
  return list
    .map(n => ({
      id: n.id || n.note_id || '',
      title: n.display_title || n.title || n.note_card?.display_title || '',
      coverUrl: n.cover?.url_default || n.cover?.url || n.image_list?.[0]?.url || n.note_card?.cover?.url_default || '',
      likes: parseCount(n.interact_info?.liked_count ?? n.liked_count),
      collects: parseCount(n.interact_info?.collected_count ?? n.collected_count),
      comments: parseCount(n.interact_info?.comment_count ?? n.comment_count),
      type: n.type || 'normal',
    }))
    .filter(n => n.title)
}

// 抓取用户笔记列表
app.post('/api/user-notes', async (req, res) => {
  const { url, cookie, count = 20 } = req.body
  if (!url || !cookie) {
    return res.status(400).json({ error: '缺少 url 或 cookie 参数' })
  }

  let context = null
  try {
    const b = await getBrowser()
    context = await b.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    await context.addCookies(parseCookieString(cookie))
    const page = await context.newPage()

    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })

    // 等待笔记卡片渲染
    await page.waitForSelector('section.note-item', { timeout: 10000 }).catch(() => {})

    // 滚动触发更多笔记懒加载
    let prevCount = 0
    for (let i = 0; i < 6; i++) {
      const cur = await page.evaluate(() => document.querySelectorAll('section.note-item').length)
      if (cur >= count) break
      if (cur === prevCount && i > 1) break  // 连续两次没新增，停止
      prevCount = cur
      await page.evaluate(() => window.scrollBy(0, 3000))
      await page.waitForTimeout(2000)
    }

    // 从 DOM 提取账号信息
    const accountInfo = await page.evaluate(() => {
      const nameEl = document.querySelector('.user-name, .username, [data-v-3ce3c27d] .user-name, .info .name')
      const redIdEl = document.querySelector('.user-redId, .red-id, .userId')
      // 从 URL 中提取 userId
      const urlMatch = location.pathname.match(/\/user\/profile\/([a-f0-9]{24})/)
      // 小红书号形如 "小红书号：abc123"，去掉前缀取纯号码
      const rawRedId = redIdEl?.textContent?.trim() || ''
      const userRedId = rawRedId.replace(/^.*[：:]\s*/, '').trim()
      return {
        userName: nameEl?.textContent?.trim() || '',
        userId: urlMatch?.[1] || '',
        userRedId,
      }
    })

    // 从 DOM 提取笔记
    const result = (await page.evaluate(() => {
      return Array.from(document.querySelectorAll('section.note-item')).map(el => {
        const titleEl = el.querySelector('.title span') || el.querySelector('.footer .title') || el.querySelector('.title')
        const imgEl = el.querySelector('img')
        const likeEl = el.querySelector('.like-wrapper .count') || el.querySelector('.like-wrapper span:last-child')
        const linkEl = el.querySelector('a.cover')
        const href = linkEl?.getAttribute('href') || ''
        // href 格式 /user/profile/{uid}/{noteId}，取最后一个 24 位 hex
        const ids = href.match(/\/([a-f0-9]{24})/g) || []
        const id = ids[ids.length - 1]?.slice(1) || Math.random().toString(36).slice(2)
        return {
          id,
          title: titleEl?.textContent?.trim() || '',
          coverUrl: imgEl?.src || '',
          likes: parseInt((likeEl?.textContent || '0').replace(/[^0-9]/g, '')) || 0,
          collects: 0,
          comments: 0,
          type: 'normal',
        }
      }).filter(n => n.title)
    })).slice(0, count)

    res.json({ success: true, notes: result, total: result.length, ...accountInfo })
  } catch (err) {
    res.status(500).json({ error: err.message || '抓取失败，请检查链接和 Cookie' })
  } finally {
    if (context) await context.close().catch(() => {})
  }
})

// 抓取单篇笔记内容（标题、正文、图片链接、标签）
app.post('/api/note-content', async (req, res) => {
  const { urls, cookie } = req.body
  if (!urls || !Array.isArray(urls) || urls.length === 0 || !cookie) {
    return res.status(400).json({ error: '缺少 urls 或 cookie 参数' })
  }

  const results = []
  let context = null
  try {
    const b = await getBrowser()
    context = await b.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    await context.addCookies(parseCookieString(cookie))

    for (const url of urls.slice(0, 3)) {
      const page = await context.newPage()
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
        await page.waitForSelector('#detail-title, .note-content .title, .title', { timeout: 8000 }).catch(() => {})

        const note = await page.evaluate(() => {
          const title =
            document.querySelector('#detail-title')?.textContent?.trim() ||
            document.querySelector('.note-content .title')?.textContent?.trim() ||
            document.querySelector('h1')?.textContent?.trim() || ''

          // 正文：去掉话题标签部分，只取纯文字
          const descEl = document.querySelector('#detail-desc .desc, .note-content #detail-desc, .desc')
          const tags = []
          if (descEl) {
            descEl.querySelectorAll('a.topic, .tag').forEach((el) => {
              const t = el.textContent?.trim()
              if (t) tags.push(t)
            })
          }
          const rawDesc = descEl?.textContent?.trim() || ''
          const content = rawDesc.replace(/#\S+/g, '').trim()

          // 图片（最多取6张）
          const imageUrls = []
          document.querySelectorAll('.swiper-slide img, .note-image img, .image-slide img').forEach((img) => {
            const src = img.src
            if (src && src.startsWith('http') && !imageUrls.includes(src)) {
              imageUrls.push(src)
            }
          })

          // 视频封面
          const videoEl = document.querySelector('video')
          const type = videoEl ? 'video' : 'image'

          return { title, content, imageUrls: imageUrls.slice(0, 6), tags, type }
        })

        results.push({ url, ...note })
      } catch (err) {
        results.push({ url, title: '', content: '', imageUrls: [], tags: [], type: 'image', error: err.message })
      } finally {
        await page.close().catch(() => {})
      }
    }

    res.json({ success: true, notes: results })
  } catch (err) {
    res.status(500).json({ error: err.message || '抓取失败' })
  } finally {
    if (context) await context.close().catch(() => {})
  }
})

// 校验 Cookie 是否有效（请求小红书用户信息接口）
app.post('/api/validate-cookie', async (req, res) => {
  const { cookie } = req.body
  if (!cookie) return res.status(400).json({ valid: false, error: '缺少 cookie' })

  let context = null
  try {
    const b = await getBrowser()
    context = await b.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })
    await context.addCookies(parseCookieString(cookie))
    const page = await context.newPage()

    const response = await page.goto('https://edith.xiaohongshu.com/api/sns/web/v2/user/me', {
      waitUntil: 'commit',
      timeout: 10000,
    })
    const json = await response.json().catch(() => null)
    const valid = json?.code === 0 && json?.success === true && !json?.data?.guest
    res.json({ valid, userName: json?.data?.nickname || '' })
  } catch {
    res.json({ valid: false })
  } finally {
    if (context) await context.close().catch(() => {})
  }
})

// 扫码登录小红书，返回捕获到的 cookie 字符串
app.post('/api/login-xhs', async (req, res) => {
  let loginBrowser = null
  try {
    // 单独启动一个有界面的浏览器，不复用 headless 的 browser 实例
    loginBrowser = await chromium.launch({
      headless: false,
      args: ['--window-size=500,700'],
    })
    const context = await loginBrowser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 500, height: 700 },
    })
    const page = await context.newPage()
    await page.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded', timeout: 15000 })

    // 轮询检测登录成功（每 2s 调用用户信息接口确认非 guest，最多等 3 分钟）
    const deadline = Date.now() + 3 * 60 * 1000
    let loggedIn = false
    while (Date.now() < deadline) {
      await page.waitForTimeout(2000)
      try {
        const resp = await context.request.get('https://edith.xiaohongshu.com/api/sns/web/v2/user/me')
        const json = await resp.json().catch(() => null)
        if (json?.code === 0 && json?.success === true && !json?.data?.guest) {
          loggedIn = true
          break
        }
      } catch {
        // 未登录时接口可能报错，继续等待
      }
    }

    if (!loggedIn) {
      await loginBrowser.close()
      return res.status(408).json({ error: '登录超时，请重试' })
    }

    // 等 1s 让其他 cookie 写入完毕
    await page.waitForTimeout(1000)
    const allCookies = await context.cookies('https://www.xiaohongshu.com')
    const cookieStr = allCookies.map(c => `${c.name}=${c.value}`).join('; ')

    await loginBrowser.close()
    res.json({ success: true, cookie: cookieStr })
  } catch (err) {
    if (loginBrowser) await loginBrowser.close().catch(() => {})
    res.status(500).json({ error: err.message || '登录失败' })
  }
})

// 封面图代理（绕过 CORS）
app.get('/img-proxy', (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).send('Missing url')

  const options = {
    headers: {
      'Referer': 'https://www.xiaohongshu.com',
      'User-Agent': 'Mozilla/5.0',
    },
  }

  https.get(url, options, (imgRes) => {
    res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=3600')
    imgRes.pipe(res)
  }).on('error', (e) => res.status(500).send(e.message))
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`\nXHS 代理服务已启动：http://localhost:${PORT}`)
  console.log('前端 Vite 应用会自动通过 /xhs-api 路由到此服务\n')
  console.log('首次使用前请确认已安装浏览器：npx playwright install chromium\n')
})

process.on('SIGINT', async () => {
  if (browser) await browser.close()
  process.exit(0)
})
