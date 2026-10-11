// 情侣点菜 · 唯一后端接口（Vercel Serverless Function）
// 数据存 Upstash Redis（Vercel 面板里一键创建，免费额度足够两个人用）
const crypto = require('crypto')

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

async function redis(...cmd) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  })
  const j = await res.json()
  if (j.error) throw new Error(j.error)
  return j.result
}

const getJSON = async (key) => {
  const v = await redis('GET', key)
  return v ? JSON.parse(v) : null
}
const setJSON = (key, val, ttl) =>
  ttl ? redis('SET', key, JSON.stringify(val), 'EX', ttl) : redis('SET', key, JSON.stringify(val))

const WISH_TTL = 3 * 24 * 3600 // 心愿单保留 3 天，之后自动清理

function genCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// 北京时间的今天 YYYY-MM-DD
const today = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)

const userKey = (uid) => `user:${uid}`
const coupleKey = (code) => `couple:${code}`
const wishKey = (code, date) => `wishes:${code}:${date}`
const dishKey = (scope) => `dishes:${scope}`
const histKey = (code) => `history:${code}`
const pushKey = (uid) => `push:${uid}`
const migKey = (code) => `migrate:${code}`
const HIST_MAX = 400 // 账本最多保留 400 条，够记大半年

// ---- 照片存储（Vercel Blob） ----
async function putBlob(pathname, buf, contentType) {
  if (global.__blobPutOverride) return global.__blobPutOverride(pathname, buf, contentType)
  const { put } = require('@vercel/blob')
  const res = await put(pathname, buf, { access: 'public', contentType, addRandomSuffix: true })
  return res.url
}

// ---- 网页推送（Web Push） ----
function displayName(u) {
  if (!u) return 'TA'
  return u.nickname || (u.role === 'girl' ? '小仙女' : (u.role === 'boy' ? '小当家' : 'TA'))
}

async function getPartnerUid(user) {
  if (!user.coupleCode) return null
  const couple = await getJSON(coupleKey(user.coupleCode))
  if (!couple) return null
  return (couple.members || []).find((m) => m !== user.uid) || null
}

// 推送失败绝不影响主流程
async function sendPushTo(targetUid, payload) {
  try {
    if (!targetUid) return
    if (global.__pushOverride) return global.__pushOverride(targetUid, payload)
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) return
    const sub = await getJSON(pushKey(targetUid))
    if (!sub) return
    const webpush = require('web-push')
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:love-menu@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    await webpush.sendNotification(sub, JSON.stringify(payload))
  } catch (e) {
    // 订阅已失效（换浏览器/清缓存）就清掉
    if (e && (e.statusCode === 404 || e.statusCode === 410)) {
      await redis('DEL', pushKey(targetUid)).catch(() => {})
    }
  }
}

async function getUser(uid) {
  return (await getJSON(userKey(uid))) || { uid, role: '', nickname: '', coupleCode: '' }
}

function publicUser(u) {
  return u ? { role: u.role || '', nickname: u.nickname || '' } : null
}

const handlers = {
  async hello(uid) {
    const user = await getUser(uid)
    let couple = null
    let partner = null
    if (user.coupleCode) {
      couple = await getJSON(coupleKey(user.coupleCode))
      if (couple) {
        const pid = (couple.members || []).find((m) => m !== uid)
        if (pid) partner = await getUser(pid)
      } else {
        user.coupleCode = ''
        await setJSON(userKey(uid), user)
      }
    }
    return {
      user: publicUser(user),
      partner: publicUser(partner),
      couple: couple ? { code: couple.code, paired: (couple.members || []).length === 2 } : null
    }
  },

  async setProfile(uid, data) {
    const user = await getUser(uid)
    if (data.role === 'girl' || data.role === 'boy') user.role = data.role
    if (typeof data.nickname === 'string') user.nickname = data.nickname.trim().slice(0, 12)
    await setJSON(userKey(uid), user)
    return { ok: true }
  },

  async createCouple(uid) {
    const user = await getUser(uid)
    if (user.coupleCode) throw new Error('你已经有另一半啦')
    let code = genCode()
    for (let i = 0; i < 5; i++) {
      if (!(await getJSON(coupleKey(code)))) break
      code = genCode()
    }
    await setJSON(coupleKey(code), { code, members: [uid], createdAt: Date.now() })
    user.coupleCode = code
    await setJSON(userKey(uid), user)
    return { code }
  },

  async joinCouple(uid, data) {
    const user = await getUser(uid)
    if (user.coupleCode) throw new Error('你已经有另一半啦')
    const code = String(data.code || '').trim().toUpperCase()
    if (code.length !== 6) throw new Error('请输入 6 位邀请码')
    const couple = await getJSON(coupleKey(code))
    if (!couple) throw new Error('邀请码不存在，检查一下有没有输错哦')
    if ((couple.members || []).includes(uid)) throw new Error('不能和自己配对哦')
    if ((couple.members || []).length >= 2) throw new Error('这个邀请码已经被使用啦')
    couple.members.push(uid)
    await setJSON(coupleKey(code), couple)
    user.coupleCode = code
    await setJSON(userKey(uid), user)
    return { ok: true }
  },

  async unbind(uid) {
    const user = await getUser(uid)
    if (!user.coupleCode) throw new Error('还没有绑定另一半')
    const couple = await getJSON(coupleKey(user.coupleCode))
    if (couple) {
      for (const m of couple.members || []) {
        const mu = await getUser(m)
        mu.coupleCode = ''
        await setJSON(userKey(m), mu)
      }
      await redis('DEL', coupleKey(user.coupleCode))
      await redis('DEL', histKey(user.coupleCode))
    } else {
      user.coupleCode = ''
      await setJSON(userKey(uid), user)
    }
    return { ok: true }
  },

  async addWishes(uid, data) {
    const user = await getUser(uid)
    if (!user.coupleCode) throw new Error('先绑定另一半才能点菜哦')
    const items = (data.items || []).slice(0, 20)
    if (!items.length) throw new Error('还没有选菜哦')
    const note = String(data.note || '').trim().slice(0, 50)
    const key = wishKey(user.coupleCode, today())
    const list = (await getJSON(key)) || []
    const now = Date.now()
    const created = items.map((it, i) => ({
      id: crypto.randomUUID(),
      uid,
      name: String(it.name || '').slice(0, 20),
      emoji: String(it.emoji || '🍽️').slice(0, 8),
      note,
      status: 'pending', // pending 等接单 -> cooking 做饭中 -> done 已上菜
      createdAt: now + i
    }))
    list.unshift(...created)
    await setJSON(key, list.slice(0, 100), WISH_TTL)
    // 同步写入点菜账本（永久保留，供历史汇总）
    const hk = histKey(user.coupleCode)
    const hist = (await getJSON(hk)) || []
    hist.unshift(...created)
    await setJSON(hk, hist.slice(0, HIST_MAX))
    // 通知另一半
    const names = created.map((w) => w.name).slice(0, 3).join('、')
    await sendPushTo(await getPartnerUid(user), {
      title: '💌 ' + displayName(user) + ' 点菜啦',
      body: names + (created.length > 3 ? ' 等 ' + created.length + ' 道菜' : '') + (note ? '：' + note : ''),
      tag: 'order'
    })
    return { count: items.length }
  },

  async listWishes(uid) {
    const user = await getUser(uid)
    if (!user.coupleCode) return { mine: [], partners: [] }
    const list = (await getJSON(wishKey(user.coupleCode, today()))) || []
    const mine = []
    const partners = []
    for (const w of list) {
      const item = { id: w.id, name: w.name, emoji: w.emoji, note: w.note || '', status: w.status, createdAt: w.createdAt, photo: w.photo || '' }
      if (w.uid === uid) mine.push(item)
      else partners.push(item)
    }
    return { mine, partners, date: today() }
  },

  async updateWish(uid, data) {
    const user = await getUser(uid)
    if (!user.coupleCode) throw new Error('还没有绑定另一半')
    if (data.status !== 'cooking' && data.status !== 'done') throw new Error('无效状态')
    const key = wishKey(user.coupleCode, today())
    const list = (await getJSON(key)) || []
    const w = list.find((x) => x.id === data.id)
    if (!w) throw new Error('找不到这道菜')
    w.status = data.status
    await setJSON(key, list, WISH_TTL)
    // 账本里的这条也同步状态
    const hk = histKey(user.coupleCode)
    const hist = (await getJSON(hk)) || []
    const hw = hist.find((x) => x.id === data.id)
    if (hw) {
      hw.status = data.status
      await setJSON(hk, hist)
    }
    // 通知点菜的那个人（自己接自己的单就不用了）
    if (w.uid !== uid) {
      await sendPushTo(w.uid, data.status === 'cooking'
        ? { title: '🍳 ' + displayName(user) + ' 接单啦', body: '「' + w.name + '」做起来了，等着开饭吧～', tag: 'status' }
        : { title: '🍽️ 上菜啦！', body: '「' + w.name + '」做好了，快去吃 😋', tag: 'status' })
    }
    return { ok: true }
  },

  async deleteWish(uid, data) {
    const user = await getUser(uid)
    if (!user.coupleCode) throw new Error('还没有绑定另一半')
    const key = wishKey(user.coupleCode, today())
    const list = (await getJSON(key)) || []
    const w = list.find((x) => x.id === data.id)
    if (!w) throw new Error('找不到这道菜')
    if (w.uid !== uid) throw new Error('只能删除自己点的菜哦')
    await setJSON(key, list.filter((x) => x.id !== data.id), WISH_TTL)
    // 撤销的菜不留在账本里
    const hk = histKey(user.coupleCode)
    const hist = (await getJSON(hk)) || []
    if (hist.some((x) => x.id === data.id)) {
      await setJSON(hk, hist.filter((x) => x.id !== data.id))
    }
    return { ok: true }
  },

  async listHistory(uid) {
    const user = await getUser(uid)
    if (!user.coupleCode) return { entries: [] }
    const hist = (await getJSON(histKey(user.coupleCode))) || []
    return {
      entries: hist.map((w) => ({
        id: w.id,
        name: w.name,
        emoji: w.emoji,
        note: w.note || '',
        status: w.status,
        createdAt: w.createdAt,
        photo: w.photo || '',
        mine: w.uid === uid
      }))
    }
  },

  // 拍照记录：图片传 Blob，链接写进今日菜单 + 账本
  async uploadPhoto(uid, data) {
    const user = await getUser(uid)
    if (!user.coupleCode) throw new Error('先绑定另一半哦')
    const m = String(data.image || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/)
    if (!m) throw new Error('图片格式不对，换一张试试')
    const buf = Buffer.from(m[2], 'base64')
    if (buf.length < 100) throw new Error('图片好像是空的')
    if (buf.length > 1.8 * 1024 * 1024) throw new Error('图片太大啦，换小一点的吧')

    const hk = histKey(user.coupleCode)
    const hist = (await getJSON(hk)) || []
    const hw = hist.find((x) => x.id === data.id)
    if (!hw) throw new Error('找不到这道菜的记录')

    const ext = m[1] === 'jpeg' ? 'jpg' : m[1]
    const url = await putBlob('photos/' + user.coupleCode + '/' + data.id + '.' + ext, buf, 'image/' + m[1])

    hw.photo = url
    await setJSON(hk, hist)
    // 今日菜单里如果还有这条，也同步
    const wk = wishKey(user.coupleCode, today())
    const list = (await getJSON(wk)) || []
    const w = list.find((x) => x.id === data.id)
    if (w) {
      w.photo = url
      await setJSON(wk, list, WISH_TTL)
    }

    await sendPushTo(await getPartnerUid(user), {
      title: '📷 ' + displayName(user) + ' 晒图啦',
      body: '「' + hw.name + '」的照片记进小账本了，快去看看',
      tag: 'photo'
    })
    return { photo: url }
  },

  // 设备迁移：旧设备生成一次性迁移码，新设备凭码取回身份
  // （iPhone 添加到主屏幕、换手机、清缓存后都用这个找回账号）
  async createMigration(uid) {
    let code = genCode()
    for (let i = 0; i < 5; i++) {
      if (!(await getJSON(migKey(code)))) break
      code = genCode()
    }
    await setJSON(migKey(code), { uid }, 30 * 60) // 30 分钟有效
    return { code }
  },

  async claimMigration(uid, data) {
    const code = String(data.code || '').trim().toUpperCase()
    if (code.length !== 6) throw new Error('请输入 6 位迁移码')
    const rec = await getJSON(migKey(code))
    if (!rec || !rec.uid) throw new Error('迁移码不存在或已过期，去旧设备重新生成一个吧')
    await redis('DEL', migKey(code)) // 一次性使用
    return { uid: rec.uid }
  },

  // 保存/删除推送订阅（一台设备一份，换设备自动覆盖）
  async savePushSub(uid, data) {
    const sub = data.sub
    if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) {
      throw new Error('订阅信息不对')
    }
    await setJSON(pushKey(uid), { endpoint: sub.endpoint, keys: sub.keys || {} })
    return { ok: true }
  },

  async removePushSub(uid) {
    await redis('DEL', pushKey(uid))
    return { ok: true }
  },

  async addDish(uid, data) {
    const user = await getUser(uid)
    const name = String(data.name || '').trim().slice(0, 20)
    if (!name) throw new Error('菜名不能为空')
    const scope = user.coupleCode || uid
    const key = dishKey(scope)
    const list = (await getJSON(key)) || []
    if (list.some((d) => d.name === name)) throw new Error('这道菜已经在菜单里啦')
    list.unshift({ id: crypto.randomUUID(), uid, name, emoji: String(data.emoji || '🍽️').slice(0, 8), createdAt: Date.now() })
    await setJSON(key, list.slice(0, 100))
    return { ok: true }
  },

  async listDishes(uid) {
    const user = await getUser(uid)
    const keys = [dishKey(uid)]
    if (user.coupleCode) keys.push(dishKey(user.coupleCode))
    const seen = new Set()
    const out = []
    for (const key of keys) {
      for (const d of (await getJSON(key)) || []) {
        if (seen.has(d.name)) continue
        seen.add(d.name)
        out.push({ id: d.id, name: d.name, emoji: d.emoji, mine: d.uid === uid })
      }
    }
    return out
  },

  async deleteDish(uid, data) {
    const user = await getUser(uid)
    const keys = [dishKey(uid)]
    if (user.coupleCode) keys.push(dishKey(user.coupleCode))
    for (const key of keys) {
      const list = (await getJSON(key)) || []
      if (list.some((d) => d.id === data.id)) {
        await setJSON(key, list.filter((d) => d.id !== data.id))
        return { ok: true }
      }
    }
    throw new Error('找不到这道菜')
  }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, msg: '只支持 POST' })
  }
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(200).json({ ok: false, code: 'NO_DB', msg: '服务端还没配置数据库' })
  }
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch (e) { body = {} }
  }
  const { action, uid, data = {} } = body || {}
  if (!uid || typeof uid !== 'string' || uid.length > 64) {
    return res.status(200).json({ ok: false, msg: '缺少用户标识' })
  }
  const handler = handlers[action]
  if (!handler) {
    return res.status(200).json({ ok: false, msg: '未知操作: ' + action })
  }
  try {
    const result = await handler(uid, data)
    return res.status(200).json({ ok: true, data: result })
  } catch (e) {
    return res.status(200).json({ ok: false, msg: e.message || '出错了，请稍后再试' })
  }
}
