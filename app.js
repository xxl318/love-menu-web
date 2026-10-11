'use strict'

/* ================= 像素精灵（手绘点阵，代码生成 SVG） ================= */
const PAL = {
  W: '#fffdf8', // 厨师帽
  S: '#ffd9c0', // 皮肤
  H: '#7a4a35', // 女生头发
  K: '#4a3a3a', // 男生头发
  E: '#3a2e2a', // 眼睛/描边
  B: '#ff9eb0', // 腮红
  M: '#e2607e', // 嘴巴
  P: '#ff6e9c', // 裙子
  L: '#5b8def', // 男生衣服
  R: '#ff3d6e', // 爱心
  C: '#ffe8c8', // 包子身体
  T: '#f0b878', // 包子褶
  N: '#ffdfc2'  // 碗
}

const SPRITES = {
  girl: [
    '..WWWWWWWW..',
    '.WWWWWWWWWW.',
    '.WWWWWWWWWW.',
    '.HHHHHHHHHH.',
    'HHSSSSSSSSHH',
    'HHSESSSSESHH',
    'HHSSSSSSSSHH',
    '.HSBSSSSBSH.',
    '..SSSMMSSS..',
    '..PPPPPPPP..',
    '.PPPPRRPPPP.',
    '.PPPPPPPPPP.',
    '...S....S...',
    '..PP....PP..'
  ],
  boy: [
    '..WWWWWWWW..',
    '.WWWWWWWWWW.',
    '.WWWWWWWWWW.',
    '.KKKKKKKKKK.',
    '.KSSSSSSSSK.',
    '.KSESSSSESK.',
    '.KSSSSSSSSK.',
    '..SBSSSSBS..',
    '..SSSMMSSS..',
    '..LLLLLLLL..',
    '.LLLLRRLLLL.',
    '.LLLLLLLLLL.',
    '...S....S...',
    '..KK....KK..'
  ],
  bun: [
    '.....TTTT.....',
    '...TTTTTTTT...',
    '..CCCCCCCCCC..',
    '.CCCCCCCCCCCC.',
    '.CCEECCCCEECC.',
    '.CCEECCCCEECC.',
    '.CBCCCMMCCCBC.',
    '.CCCCCCCCCCCC.',
    '..CCCCCCCCCC..',
    '...CCCCCCCC...'
  ],
  heart: [
    '.RR.RR.',
    'RWRRRRR',
    'RRRRRRR',
    '.RRRRR.',
    '..RRR..',
    '...R...'
  ],
  bowl: [
    '.RRRRRRRR.',
    '.NNNNNNNN.',
    '.NNNNNNNN.',
    '..NNNNNN..',
    '...NNNN...'
  ],
  face: [
    '..CCCCCC..',
    '.CCCCCCCC.',
    '.CEECCEEC.',
    '.CCCMMCCC.',
    '.CCCCCCCC.',
    '..CCCCCC..'
  ],
  book: [
    '.EEEEEEEE.',
    '.EPPPPPPE.',
    '.EPWPPWPE.',
    '.EPWWWWPE.',
    '.EPPWWPPE.',
    '.EPPPPPPE.',
    '.EPPPPPPE.',
    '.EWWWWWWE.',
    '.EEEEEEEE.'
  ],
  pot: [
    '.....RR.....',
    '..RRRRRRRR..',
    'NKKKKKKKKKKN',
    '.KWKKKKKKKK.',
    '.KWKKKKKKKK.',
    '.KKKKKKKKKK.',
    '..KKKKKKKK..'
  ],
  chef: [
    '....WWWWWW....',
    '...WWWWWWWW...',
    '....TTTTTT....',
    '..CCCCCCCCCC..',
    '.CCCCCCCCCCCC.',
    '.CCEECCCCEECC.',
    '.CCEECCCCEECC.',
    '.CBCCCMMCCCBC.',
    '.CCCCCCCCCCCC.',
    '..CCCCCCCCCC..',
    '...CCCCCCCC...'
  ]
}

function sprite(name, px = 5) {
  const map = SPRITES[name]
  if (!map) return ''
  const w = map[0].length
  const h = map.length
  let rects = ''
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch !== '.') rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + (PAL[ch] || '#000') + '"/>'
    }
  })
  return '<svg width="' + w * px + '" height="' + h * px + '" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + rects + '</svg>'
}

/* ================= 基础设施 ================= */
const $ = (sel) => document.querySelector(sel)

let uid = localStorage.getItem('lm_uid')
if (!uid) {
  uid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'u' + Date.now() + Math.random().toString(16).slice(2)
  localStorage.setItem('lm_uid', uid)
}

const state = {
  tab: 'home',
  loaded: false,
  user: null,
  partner: null,
  couple: null,
  wishes: { mine: [], partners: [] },
  dishes: [],
  activeCat: 0,
  selected: {},   // name -> emoji
  note: '',
  joinCode: '',
  nickname: '',
  newDishName: '',
  newDishEmoji: '🍳',
  // 下厨房
  cookSel: {},     // 已选食材 name -> true
  cookTools: {},   // 已选厨具 name -> true
  cookStrict: false,
  // 点菜小账本
  history: null,   // null = 还没加载
  // 拍照 & 推送
  photoWishId: '',
  pushOn: false,
  // 设备迁移
  migCode: ''
}

const STATUS = {
  pending: { text: '⏳ 等TA接单', cls: 'pending' },
  cooking: { text: '🍳 做饭中', cls: 'cooking' },
  done: { text: '😋 已上菜', cls: 'done' }
}

const EMOJIS = ['🍳', '🍖', '🍗', '🥩', '🦐', '🐟', '🦞', '🥬', '🥦', '🍆', '🥔', '🍄', '🍅', '🥒', '🍲', '🍜', '🍚', '🥟', '🍕', '🍰', '🧋', '🍹']

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

let toastTimer = null
function toast(msg) {
  const el = $('#toast')
  el.textContent = msg
  el.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { el.hidden = true }, 2200)
}

/* ================= 拍照：前端压缩（长边 1280px / JPEG 72%，约 200KB） ================= */
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type || file.type.indexOf('image/') !== 0) return reject(new Error('请选择图片文件哦'))
    const img = new Image()
    img.onload = () => {
      try {
        const max = 1280
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const cv = document.createElement('canvas')
        cv.width = w
        cv.height = h
        cv.getContext('2d').drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(img.src)
        resolve(cv.toDataURL('image/jpeg', 0.72))
      } catch (e) { reject(new Error('图片处理失败，换一张试试')) }
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('图片读取失败')) }
    img.src = URL.createObjectURL(file)
  })
}

/* ================= 网页推送 ================= */
const VAPID_PUBLIC_KEY = 'BKH6YQjz9hmxkYYZ9pm_tKgc_JU6qF9--fYjh8nZQ_6dEol0VPsSkMvj6Iqya7pcL5fpihF2-jrVUiZTpOQDJpQ'

function urlB64ToUint8(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

async function checkPush() {
  try {
    if (!pushSupported()) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = reg && (await reg.pushManager.getSubscription())
    const on = !!sub && Notification.permission === 'granted'
    if (on !== state.pushOn) {
      state.pushOn = on
      renderHome()
      renderMine()
    }
  } catch (e) { /* 不支持就算了 */ }
}

function copyText(text, msg) {
  const done = () => toast(msg || '已复制')
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done))
  } else {
    fallbackCopy(text, done)
  }
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch (e) { /* ignore */ }
  document.body.removeChild(ta)
  done()
}

/* ================= 本地演示模式（没有后端时自动启用） ================= */
const LOCAL = {
  enabled: false,
  enable() {
    if (this.enabled) return
    this.enabled = true
    $('#local-banner').style.display = 'block'
  },
  read() {
    try { return JSON.parse(localStorage.getItem('lm_demo') || '{}') } catch (e) { return {} }
  },
  write(d) { localStorage.setItem('lm_demo', JSON.stringify(d)) },
  async call(action, data = {}) {
    const d = this.read()
    d.user = d.user || { role: '', nickname: '' }
    d.wishes = d.wishes || []
    d.dishes = d.dishes || []
    const day = new Date().toDateString()

    if (action === 'hello') {
      if (d.user.role && d.seeded !== day) {
        d.seeded = day
        d.wishes.unshift(
          { id: 'demo-a-' + Date.now(), uid: 'ta', name: '可乐鸡翅', emoji: '🍗', note: '想吃甜一点的～', status: 'pending', createdAt: Date.now() - 3600e3, day },
          { id: 'demo-b-' + Date.now(), uid: 'ta', name: '番茄蛋汤', emoji: '🍅', note: '', status: 'pending', createdAt: Date.now() - 1800e3, day }
        )
        this.write(d)
      }
      if (d.user.role && !d.histSeeded) {
        // 给账本造一点昨天的演示数据
        d.histSeeded = true
        const y = Date.now() - 86400e3
        const yday = new Date(y).toDateString()
        d.wishes.push(
          { id: 'demo-h1', uid: 'me', name: '红烧肉', emoji: '🍖', note: '', status: 'done', createdAt: y, day: yday },
          { id: 'demo-h2', uid: 'ta', name: '蛋炒饭', emoji: '🍚', note: '', status: 'done', createdAt: y + 1200e3, day: yday }
        )
        this.write(d)
      }
      const partnerRole = d.user.role === 'boy' ? 'girl' : 'boy'
      return {
        user: { role: d.user.role, nickname: d.user.nickname },
        partner: d.user.role ? { role: partnerRole, nickname: '演示的TA' } : null,
        couple: d.user.role ? { code: 'DEMO66', paired: true } : null
      }
    }
    if (action === 'setProfile') {
      if (data.role) d.user.role = data.role
      if (typeof data.nickname === 'string') d.user.nickname = data.nickname.trim().slice(0, 12)
      this.write(d)
      return { ok: true }
    }
    if (action === 'addWishes') {
      const now = Date.now()
      ;(data.items || []).forEach((it, i) => {
        d.wishes.unshift({
          id: 'w' + now + i, uid: 'me', name: it.name, emoji: it.emoji,
          note: String(data.note || '').slice(0, 50), status: 'pending', createdAt: now + i, day
        })
      })
      d.wishes = d.wishes.slice(0, 400)
      this.write(d)
      return { count: (data.items || []).length }
    }
    if (action === 'listWishes') {
      const list = d.wishes.filter((w) => w.day === day)
      return {
        mine: list.filter((w) => w.uid === 'me'),
        partners: list.filter((w) => w.uid !== 'me')
      }
    }
    if (action === 'updateWish') {
      const w = d.wishes.find((x) => x.id === data.id)
      if (w) w.status = data.status
      this.write(d)
      return { ok: true }
    }
    if (action === 'deleteWish') {
      d.wishes = d.wishes.filter((x) => x.id !== data.id)
      this.write(d)
      return { ok: true }
    }
    if (action === 'addDish') {
      if (!data.name) throw new Error('菜名不能为空')
      if (d.dishes.some((x) => x.name === data.name)) throw new Error('这道菜已经在菜单里啦')
      d.dishes.unshift({ id: 'd' + Date.now(), name: data.name, emoji: data.emoji || '🍽️' })
      this.write(d)
      return { ok: true }
    }
    if (action === 'listDishes') return d.dishes
    if (action === 'deleteDish') {
      d.dishes = d.dishes.filter((x) => x.id !== data.id)
      this.write(d)
      return { ok: true }
    }
    if (action === 'listHistory') {
      const list = d.wishes.slice().sort((a, b) => b.createdAt - a.createdAt)
      return {
        entries: list.map((w) => ({
          id: w.id, name: w.name, emoji: w.emoji, note: w.note || '',
          status: w.status, createdAt: w.createdAt, photo: w.photo || '', mine: w.uid === 'me'
        }))
      }
    }
    if (action === 'uploadPhoto') {
      const w = d.wishes.find((x) => x.id === data.id)
      if (!w) throw new Error('找不到这道菜的记录')
      w.photo = data.image
      try { this.write(d) } catch (e) { throw new Error('本地存储放不下啦（演示模式限制，部署后不限）') }
      return { photo: data.image }
    }
    if (action === 'savePushSub' || action === 'removePushSub') {
      throw new Error('演示模式不支持推送，部署后从手机打开就能开啦')
    }
    throw new Error('演示模式暂不支持这个操作，部署后即可使用')
  }
}

/* ================= API ================= */
async function api(action, data = {}) {
  if (LOCAL.enabled) return LOCAL.call(action, data)
  let j = null
  try {
    const r = await fetch('api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, uid, data })
    })
    j = await r.json()
  } catch (e) {
    LOCAL.enable()
    return LOCAL.call(action, data)
  }
  if (j.ok) return j.data
  if (j.code === 'NO_DB') {
    LOCAL.enable()
    return LOCAL.call(action, data)
  }
  throw new Error(j.msg || '出错了，请稍后再试')
}

/* ================= 数据加载 ================= */
async function refresh() {
  try {
    const info = await api('hello')
    state.user = info.user
    state.partner = info.partner
    state.couple = info.couple
    state.loaded = true
    if (state.couple && state.couple.paired) {
      const [wishes, dishes] = await Promise.all([api('listWishes'), api('listDishes')])
      state.wishes = wishes
      state.dishes = dishes
    }
  } catch (e) {
    toast(e.message)
  }
  renderAll()
}

async function loadWishes() {
  try {
    state.wishes = await api('listWishes')
    renderHome()
  } catch (e) { /* 静默，下次轮询重试 */ }
}

/* ================= 渲染 ================= */
function partnerName() {
  if (!state.partner) return 'TA'
  return state.partner.nickname || (state.partner.role === 'girl' ? '小仙女' : '小当家')
}

function dateText() {
  const d = new Date()
  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  return (d.getMonth() + 1) + '月' + d.getDate() + '日 · 星期' + weeks[d.getDay()]
}

function timeText(ts) {
  const d = new Date(ts)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function wishCard(w, isMine) {
  const st = STATUS[w.status] || STATUS.pending
  let action = ''
  if (!isMine) {
    if (w.status === 'pending') action = '<button class="btn small" onclick="App.accept(\'' + esc(w.id) + '\')">接单</button>'
    else if (w.status === 'cooking') action = '<button class="btn small ghost" onclick="App.finish(\'' + esc(w.id) + '\')">上菜</button>'
    else action = '<span class="done-mark">✅</span>'
  } else {
    if (w.status === 'pending') action = '<button class="del" onclick="App.removeWish(\'' + esc(w.id) + '\')">✕</button>'
    else if (w.status === 'done') action = '<span class="done-mark">✅</span>'
  }
  return '<div class="card wish">' +
    '<div class="wish-emoji">' + esc(w.emoji) + '</div>' +
    '<div class="wish-body">' +
    '<div class="wish-name">' + esc(w.name) + '</div>' +
    (w.note ? '<div class="wish-note">💬 ' + esc(w.note) + '</div>' : '') +
    '<div class="wish-meta"><span class="chip ' + st.cls + '">' + st.text + '</span>' +
    '<span class="wish-time">' + timeText(w.createdAt) + '</span>' +
    '<button class="photo-btn" onclick="App.pickPhoto(\'' + esc(w.id) + '\')">📷' + (w.photo ? '' : ' 拍照') + '</button></div>' +
    (w.photo ? '<img class="wish-photo" src="' + esc(w.photo) + '" alt="菜品照片" onclick="App.viewPhotoSrc(this)">' : '') +
    '</div>' + action + '</div>'
}

function renderHome() {
  const el = $('#screen-home')
  if (!state.loaded) {
    el.innerHTML = '<div class="card welcome"><div class="big-sprite">' + sprite('bun', 6) + '</div><h2>正在打开厨房...</h2></div>'
    return
  }

  // 第一步：选身份
  if (!state.user || !state.user.role) {
    el.innerHTML =
      '<div class="logo-row">' + sprite('heart', 3) + ' LOVE MENU ' + sprite('heart', 3) + '</div>' +
      '<div class="card welcome">' +
      '<div class="big-sprite">' + sprite('bun', 6) + '</div>' +
      '<h2>欢迎来到情侣点菜</h2>' +
      '<div class="sub">我是掌勺的小小～先告诉我，你是？</div>' +
      '<div class="role-row">' +
      '<div class="role-card" onclick="App.chooseRole(\'girl\')">' + sprite('girl', 5) + '<div class="role-label">我是女生</div></div>' +
      '<div class="role-card boy" onclick="App.chooseRole(\'boy\')">' + sprite('boy', 5) + '<div class="role-label">我是男生</div></div>' +
      '</div>' +
      '<div class="restore-link" onclick="App.openRestore()">🔑 换设备 / 加到主屏幕了？用迁移码找回账号</div>' +
      '</div>'
    return
  }

  // 第二步：配对
  if (!state.couple) {
    el.innerHTML =
      '<div class="logo-row">' + sprite('heart', 3) + ' LOVE MENU ' + sprite('heart', 3) + '</div>' +
      '<div class="card welcome">' +
      '<div class="big-sprite">' + sprite(state.user.role, 6) + '</div>' +
      '<h2>和TA绑定，开启小厨房</h2>' +
      '<div class="sub">一个人创建邀请码，另一个人输入即可</div>' +
      '<button class="btn wide" onclick="App.createCouple()">💌 创建我们的邀请码</button>' +
      '<div class="divider"><span>或者</span></div>' +
      '<input class="input code-input" id="join-code" maxlength="6" placeholder="输入TA的邀请码" value="' + esc(state.joinCode) + '" oninput="App.onJoinInput(this)">' +
      '<button class="btn blue wide" onclick="App.joinCouple()">❤️ 和TA配对</button>' +
      '<div class="restore-link" onclick="App.openRestore()">🔑 之前绑定过？用迁移码找回账号和记录</div>' +
      '</div>'
    return
  }

  // 已创建，等另一半加入
  if (!state.couple.paired) {
    el.innerHTML =
      '<div class="logo-row">' + sprite('heart', 3) + ' LOVE MENU ' + sprite('heart', 3) + '</div>' +
      '<div class="card welcome">' +
      '<div class="big-sprite">' + sprite(state.user.role, 6) + '</div>' +
      '<h2>把邀请码发给TA吧</h2>' +
      '<div class="code-show" onclick="App.copyCode()">' + esc(state.couple.code) + '</div>' +
      '<div class="sub">TA打开这个网址、输入邀请码，你们就绑定啦</div>' +
      '<button class="btn wide" onclick="App.shareInvite()">📋 复制邀请链接</button>' +
      '</div>'
    return
  }

  // 已配对：今日菜单
  const pw = state.wishes.partners || []
  const mw = state.wishes.mine || []
  let html =
    '<div class="hero">' +
    '<div class="float-heart">' + sprite('heart', 4) + '</div>' +
    '<div class="hero-date">' + dateText() + '</div>' +
    '<div class="hero-title">今天想吃点什么呀？</div>' +
    '<div class="hero-sprites">' + sprite(state.user.role, 4) + sprite('heart', 3) + sprite(state.partner.role, 4) + '</div>' +
    '</div>'

  html += '<div class="section-title">' + sprite('heart', 2) + ' ' + esc(partnerName()) + ' 想吃的</div>'
  if (!pw.length) {
    html += '<div class="card empty-box"><div class="empty-sprite">' + sprite('bun', 5) + '</div><p>TA还没点菜，提醒一下TA吧～</p></div>'
  } else {
    html += pw.map((w) => wishCard(w, false)).join('')
  }

  html += '<div class="section-title">' + sprite('heart', 2) + ' 我想吃的</div>'
  if (!mw.length) {
    html += '<div class="card empty-box"><div class="empty-sprite">' + sprite('bowl', 6) + '</div><p>今天还没点菜哦</p><button class="btn" onclick="App.switchTab(\'menu\')">去点菜 →</button></div>'
  } else {
    html += mw.map((w) => wishCard(w, true)).join('')
  }

  if (!state.pushOn && localStorage.getItem('lm_push_nudge') !== 'off') {
    html += '<div class="card push-nudge">' +
      '<span class="pn-bell">🔔</span>' +
      '<div class="pn-body"><b>开启做饭提醒</b>' +
      '<div class="muted">TA点菜、接单、上菜时，手机会弹通知</div></div>' +
      '<button class="btn small" onclick="App.enablePush()">开启</button>' +
      '<button class="pn-close" onclick="App.dismissPushNudge()">✕</button></div>'
  }

  html += '<div class="card ledger-entry" onclick="App.openHistory()">' +
    sprite('book', 4) +
    '<div class="le-body"><b>我们的点菜小账本</b>' +
    '<div class="muted">每天点了什么、做成了什么，小小都记着呢</div></div>' +
    '<span class="rc-arrow">▸</span></div>'

  html += '<div class="footer-note">🌸 每天零点自动开启新的一页菜单</div>'
  el.innerHTML = html
}

/* ================= 点菜小账本 ================= */
function dayLabel(ts) {
  const d = new Date(ts)
  const now = new Date()
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(now) - startOf(d)) / 86400e3)
  const weeks = ['日', '一', '二', '三', '四', '五', '六']
  let label = (d.getMonth() + 1) + '月' + d.getDate() + '日 · 星期' + weeks[d.getDay()]
  if (now.getFullYear() !== d.getFullYear()) label = d.getFullYear() + '年' + label
  if (diff === 0) label = '今天 · ' + label
  else if (diff === 1) label = '昨天 · ' + label
  return label
}

function historyStats(entries) {
  const total = entries.length
  let done = 0
  let mineCount = 0
  const counts = {}
  entries.forEach((e) => {
    if (e.status === 'done') done++
    if (e.mine) mineCount++
    if (!counts[e.name]) counts[e.name] = { name: e.name, emoji: e.emoji, n: 0 }
    counts[e.name].n++
  })
  const top = Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 3)
  return { total, done, mineCount, taCount: total - mineCount, top }
}

function renderHistory() {
  const el = $('#screen-history')
  let html = '<div class="back-row"><button class="btn small ghost" onclick="App.switchTab(\'home\')">← 返回今日菜单</button></div>'

  html += '<div class="card ledger-hero">' +
    '<div class="lh-sprites">' + sprite('book', 5) + sprite('bun', 4) + '</div>' +
    '<div><b>我们的点菜小账本</b><br><span class="muted">一日三餐，都是我们爱的证据 💕</span></div></div>'

  if (state.history === null) {
    html += '<div class="card empty-box"><div class="empty-sprite">' + sprite('book', 5) + '</div><p>小小正在翻账本...</p></div>'
    el.innerHTML = html
    return
  }

  const entries = state.history
  if (!entries.length) {
    html += '<div class="card empty-box"><div class="empty-sprite">' + sprite('bun', 5) + '</div>' +
      '<p>账本还是空的哦～<br>从今天开始，点过的每道菜都会记在这里</p>' +
      '<button class="btn" onclick="App.switchTab(\'menu\')">去点第一道菜 →</button></div>'
    el.innerHTML = html
    return
  }

  const s = historyStats(entries)

  html += '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-num">' + s.total + '</div><div class="stat-label">🍽️ 一共点了（道）</div></div>' +
    '<div class="stat-card"><div class="stat-num">' + s.done + '</div><div class="stat-label">✅ 做成上桌（道）</div></div>' +
    '<div class="stat-card"><div class="stat-num">' + s.mineCount + '</div><div class="stat-label">🙋 我点的</div></div>' +
    '<div class="stat-card"><div class="stat-num">' + s.taCount + '</div><div class="stat-label">💘 ' + esc(partnerName()) + ' 点的</div></div>' +
    '</div>'

  if (s.top.length) {
    const medals = ['🥇', '🥈', '🥉']
    html += '<div class="section-title">' + sprite('heart', 2) + ' 我们的最爱</div><div class="card">' +
      s.top.map((t, i) =>
        '<div class="rank-row"><span class="rank-medal">' + medals[i] + '</span>' +
        '<span class="rank-emoji">' + esc(t.emoji) + '</span>' +
        '<span class="rank-name">' + esc(t.name) + '</span>' +
        '<span class="rank-count">× ' + t.n + '</span></div>'
      ).join('') + '</div>'
  }

  // 按天分组（用下单时间的本地日期）
  const groups = []
  const idx = {}
  entries.forEach((e) => {
    const d = new Date(e.createdAt)
    const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()
    if (!(key in idx)) {
      idx[key] = groups.length
      groups.push({ label: dayLabel(e.createdAt), items: [] })
    }
    groups[idx[key]].items.push(e)
  })

  const stIcon = { pending: '⏳', cooking: '🍳', done: '✅' }
  groups.forEach((g) => {
    const doneN = g.items.filter((x) => x.status === 'done').length
    html += '<div class="day-head"><span>📅 ' + g.label + '</span>' +
      '<span class="day-count">' + g.items.length + ' 道 · 做成 ' + doneN + ' 道</span></div>'
    html += '<div class="card">' + g.items.map((e) =>
      '<div class="hist-row">' +
      '<span class="h-emoji">' + esc(e.emoji) + '</span>' +
      '<span class="h-name">' + esc(e.name) + (e.note ? ' <span class="h-note">💬' + esc(e.note) + '</span>' : '') + '</span>' +
      (e.photo ? '<img class="h-photo" src="' + esc(e.photo) + '" alt="照片" onclick="App.viewPhotoSrc(this)">' : '') +
      '<span class="who ' + (e.mine ? 'me' : 'ta') + '">' + (e.mine ? '我' : 'TA') + '</span>' +
      '<span class="hist-status">' + (stIcon[e.status] || '⏳') + '</span>' +
      '<span class="h-time">' + timeText(e.createdAt) + '</span>' +
      '</div>'
    ).join('') + '</div>'
  })

  html += '<div class="footer-note">📒 账本最多保留最近 400 条记录</div>'
  el.innerHTML = html
}

function allCats() {
  const cats = window.PRESET_DISHES.slice()
  cats.push({ name: '私房菜', icon: '💝', items: state.dishes.map((d) => ({ name: d.name, emoji: d.emoji })) })
  return cats
}

function renderMenu() {
  const el = $('#screen-menu')
  const cats = allCats()
  if (state.activeCat >= cats.length) state.activeCat = 0
  const cur = cats[state.activeCat]
  const count = Object.keys(state.selected).length

  let html = '<div class="cats">'
  cats.forEach((c, i) => {
    html += '<button class="cat' + (i === state.activeCat ? ' active' : '') + '" onclick="App.switchCat(' + i + ')">' + c.icon + ' ' + esc(c.name) + '</button>'
  })
  html += '</div>'

  html += '<div class="menu-tools"><button class="btn small ghost" onclick="App.randomPick()">🎲 选择困难？随机来一道</button></div>'

  html += '<div class="dish-grid">'
  if (!cur.items.length) {
    html += '<div class="card empty-box" style="grid-column:1/-1"><div class="empty-sprite">' + sprite('bun', 5) + '</div><p>还没有私房菜，去「我的」页面添加你们的专属菜吧～</p></div>'
  }
  cur.items.forEach((d) => {
    const picked = !!state.selected[d.name]
    const hasRecipe = !!window.COOK.recipes[d.name]
    html += '<div class="dish' + (picked ? ' picked' : '') + '" data-name="' + esc(d.name) + '" data-emoji="' + esc(d.emoji) + '" onclick="App.toggleDishEl(this)">' +
      (picked ? '<span class="pick-heart">' + sprite('heart', 2) + '</span>' : '') +
      (hasRecipe ? '<button class="book-badge" data-name="' + esc(d.name) + '" onclick="App.openRecipeFromEl(event, this)" aria-label="看菜谱">📖</button>' : '') +
      '<div class="dish-emoji">' + esc(d.emoji) + '</div>' +
      '<div class="dish-name">' + esc(d.name) + '</div></div>'
  })
  html += '</div>'

  html += '<div class="order-bar">' +
    (count
      ? '<span>🛒 已选 <span class="count">' + count + '</span> 道菜</span>'
      : '<span class="hint">点一点想吃的菜～</span>') +
    '<button class="btn" onclick="App.openConfirm()">告诉TA 💌</button></div>'

  el.innerHTML = html
}

/* ================= 下厨房 ================= */
const ING_EMOJI = {}
window.COOK.groups.forEach((g) => g.items.forEach(([n, e]) => { ING_EMOJI[n] = e }))
window.COOK.tools.forEach(([n, e]) => { ING_EMOJI[n] = e })

function levelHearts(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += sprite('heart', 2)
  return '<span class="hearts">' + s + '</span>'
}

// 根据所选食材/厨具匹配菜谱
function matchRecipes() {
  const sel = state.cookSel
  const selCount = Object.keys(sel).length
  const tools = state.cookTools
  const toolCount = Object.keys(tools).length
  const out = []
  for (const name of Object.keys(window.COOK.recipes)) {
    const r = window.COOK.recipes[name]
    if (toolCount && !tools[r.tool]) continue
    const have = r.need.filter((i) => sel[i])
    const miss = r.need.filter((i) => !sel[i])
    if (selCount) {
      if (state.cookStrict) {
        if (miss.length) continue // 严格：只用现有食材
      } else if (!have.length) continue // 模糊：含任一所选食材
    } else if (!toolCount) {
      continue
    }
    out.push({ name, r, have, miss })
  }
  out.sort((a, b) => (b.have.length - a.have.length) || (a.miss.length - b.miss.length) || a.name.localeCompare(b.name, 'zh'))
  return out
}

function ingChip(name, selected, onclick) {
  return '<button class="ing-chip' + (selected ? ' active' : '') + '" onclick="' + onclick + '">' +
    esc(ING_EMOJI[name] || '🍽️') + ' ' + esc(name) + '</button>'
}

function recipeCard(m) {
  const haveChips = m.have.map((i) => '<span class="match-chip have">' + esc(ING_EMOJI[i]) + ' ' + esc(i) + '</span>').join('')
  const missChips = m.miss.map((i) => '<span class="match-chip miss">缺 ' + esc(i) + '</span>').join('')
  return '<div class="card recipe-card" onclick="App.openRecipe(\'' + esc(m.name) + '\')">' +
    '<div class="rc-emoji">' + esc(m.r.emoji) + '</div>' +
    '<div class="rc-body">' +
    '<div class="rc-name">' + esc(m.name) + levelHearts(m.r.level) + '</div>' +
    '<div class="rc-meta">⏱️ ' + esc(m.r.time) + ' · ' + esc(ING_EMOJI[m.r.tool]) + ' ' + esc(m.r.tool) + '</div>' +
    '<div class="rc-ings">' + haveChips + missChips + '</div>' +
    '</div>' +
    '<div class="rc-arrow">▸</div>' +
    '</div>'
}

function renderCook() {
  const el = $('#screen-cook')
  const selCount = Object.keys(state.cookSel).length
  const toolCount = Object.keys(state.cookTools).length

  let html =
    '<div class="card cook-hero">' +
    '<div class="cook-hero-sprites">' + sprite('chef', 5) + sprite('pot', 5) + '</div>' +
    '<div class="cook-hero-text"><b>小小的小厨房</b><br>' +
    '<span class="muted">勾选家里有的食材，看看今天能做什么菜！</span></div>' +
    '</div>'

  html += '<div class="mode-row">' +
    '<button class="mode-btn' + (!state.cookStrict ? ' active' : '') + '" onclick="App.setStrict(false)">🔍 模糊搭配</button>' +
    '<button class="mode-btn' + (state.cookStrict ? ' active' : '') + '" onclick="App.setStrict(true)">🏝️ 严格模式</button>' +
    '</div>' +
    '<div class="mode-hint">' + (state.cookStrict ? '只显示用现有食材就能完成的菜（生存模式）' : '显示包含任一所选食材的菜，缺的会标出来') + '</div>'

  window.COOK.groups.forEach((g, gi) => {
    html += '<div class="ing-label">' + g.icon + ' ' + esc(g.name) + '</div><div class="ing-chips">'
    g.items.forEach(([n]) => {
      html += ingChip(n, !!state.cookSel[n], 'App.toggleIng(\'' + esc(n) + '\')')
    })
    html += '</div>'
  })

  html += '<div class="ing-label">🍳 厨具（可选）</div><div class="ing-chips">'
  window.COOK.tools.forEach(([n]) => {
    html += ingChip(n, !!state.cookTools[n], 'App.toggleTool(\'' + esc(n) + '\')')
  })
  html += '</div>'

  if (selCount || toolCount) {
    const matches = matchRecipes()
    html += '<div class="cook-result-head">' +
      '<span class="result-title">🍽️ 能做 <b>' + matches.length + '</b> 道菜</span>' +
      '<button class="clear-link" onclick="App.clearCook()">✕ 清空重选</button></div>'
    if (!matches.length) {
      html += '<div class="card empty-box"><div class="empty-sprite">' + sprite('bun', 5) + '</div>' +
        '<p>' + (state.cookStrict ? '这些食材还凑不出一道菜，再囤点货或换模糊搭配试试～' : '换个食材试试看～') + '</p></div>'
    } else {
      html += matches.map(recipeCard).join('')
    }
  } else {
    html += '<div class="card empty-box"><div class="empty-sprite">' + sprite('pot', 6) + '</div>' +
      '<p>还没选食材哦，翻翻冰箱勾几样试试！<br>比如 🍅番茄 + 🥚鸡蛋 = ？</p></div>'
  }

  html += '<div class="footer-note">📖 菜谱共 ' + Object.keys(window.COOK.recipes).length + ' 道 · 点菜页每道菜也能翻菜谱</div>'
  el.innerHTML = html
}

function openRecipeSheet(name) {
  const r = window.COOK.recipes[name]
  if (!r) return toast('这道菜还没有菜谱，等你们来创作 💝')
  const mask = $('#sheet-mask')
  const ingChips = r.need.map((i) => {
    const has = !!state.cookSel[i]
    return '<span class="match-chip ' + (has ? 'have' : 'plain') + '">' + esc(ING_EMOJI[i] || '🍽️') + ' ' + esc(i) + '</span>'
  }).join('')
  const seasonChips = r.season.map((s) => '<span class="match-chip plain">' + esc(s) + '</span>').join('')
  const steps = r.steps.map((s, i) =>
    '<li><span class="step-num">' + (i + 1) + '</span><span class="step-text">' + esc(s) + '</span></li>'
  ).join('')
  mask.innerHTML =
    '<div class="sheet recipe-sheet">' +
    '<div class="rs-head"><span class="rs-emoji">' + esc(r.emoji) + '</span>' +
    '<div><h3>' + esc(name) + '</h3>' +
    '<div class="rs-meta">⏱️ ' + esc(r.time) + ' · 难度 ' + levelHearts(r.level) + ' · ' + esc(ING_EMOJI[r.tool]) + ' ' + esc(r.tool) + '</div></div></div>' +
    '<div class="rs-label">🧺 食材</div><div class="chips">' + ingChips + '</div>' +
    '<div class="rs-label">🧂 调料</div><div class="chips">' + seasonChips + '</div>' +
    '<div class="rs-label">📖 做法</div>' +
    '<ol class="step-list">' + steps + '</ol>' +
    '<div class="btn-row">' +
    '<button class="btn ghost" onclick="App.closeConfirm()">关闭</button>' +
    '<button class="btn" onclick="App.cookToMenu(\'' + esc(name) + '\')">加入今日菜单 💌</button>' +
    '</div></div>'
  mask.hidden = false
  mask.onclick = (e) => { if (e.target === mask) App.closeConfirm() }
}

function renderMine() {
  const el = $('#screen-mine')
  const u = state.user || { role: '', nickname: '' }

  let coupleHtml = ''
  if (state.couple && state.couple.paired) {
    coupleHtml =
      '<div class="couple-box">' +
      '<div class="c-sprites">' + sprite(u.role || 'girl', 3) + sprite('heart', 2) + sprite(state.partner.role, 3) + '</div>' +
      '<div><div class="c-name">已和 ' + esc(partnerName()) + ' 绑定</div>' +
      '<div class="c-sub">一起好好吃饭，好好爱 🥰</div></div></div>' +
      '<div class="unbind-link" onclick="App.unbind()">解除绑定</div>'
  } else if (state.couple) {
    coupleHtml =
      '<div class="c-name">等待TA加入中...</div>' +
      '<div class="c-sub">邀请码 <b style="color:var(--pink-dark);letter-spacing:3px;cursor:pointer" onclick="App.copyCode()">' + esc(state.couple.code) + '</b>（点击复制）</div>'
  } else {
    coupleHtml =
      '<div class="c-name">还没绑定另一半</div>' +
      '<button class="btn wide" style="margin-top:12px" onclick="App.switchTab(\'home\')">去绑定 💕</button>'
  }

  let emojiGrid = '<div class="emoji-grid">'
  EMOJIS.forEach((e) => {
    emojiGrid += '<div class="emoji-cell' + (state.newDishEmoji === e ? ' active' : '') + '" onclick="App.pickEmoji(\'' + e + '\')">' + e + '</div>'
  })
  emojiGrid += '</div>'

  let dishList = ''
  if (state.dishes.length) {
    dishList = '<div class="card">' + state.dishes.map((d) =>
      '<div class="dish-row"><span class="dr-emoji">' + esc(d.emoji) + '</span><span class="dr-name">' + esc(d.name) + '</span>' +
      '<button class="del" onclick="App.deleteDish(\'' + esc(d.id) + '\')">✕</button></div>'
    ).join('') + '</div>'
  }

  el.innerHTML =
    '<div class="card profile">' +
    '<div class="avatar">' + sprite(u.role || 'bun', 4) + '</div>' +
    '<div class="p-body">' +
    '<input class="input" placeholder="给自己起个昵称吧" maxlength="12" value="' + esc(state.nickname) + '" oninput="App.onNickInput(this)">' +
    '<div class="p-sub">' + (u.role === 'girl' ? '小仙女 👧' : (u.role === 'boy' ? '小当家 👦' : '还没选择身份')) + '</div>' +
    '</div>' +
    '<button class="btn small" onclick="App.saveNickname()">保存</button>' +
    '</div>' +

    '<div class="section-title">' + sprite('heart', 2) + ' 我们的小家</div>' +
    '<div class="card">' + coupleHtml + '</div>' +

    '<div class="card ledger-entry" onclick="App.openHistory()">' +
    sprite('book', 4) +
    '<div class="le-body"><b>点菜小账本</b>' +
    '<div class="muted">每日点菜记录与汇总</div></div>' +
    '<span class="rc-arrow">▸</span></div>' +

    '<div class="section-title">' + sprite('heart', 2) + ' 提醒通知</div>' +
    '<div class="card">' +
    '<div class="push-row"><span class="pn-bell">🔔</span>' +
    '<div class="pn-body"><b>做饭提醒</b>' +
    '<div class="muted">' + (state.pushOn ? '已开启 · TA点菜/接单/上菜都会通知你' : '开启后 TA 的动态会推送到这台设备') + '</div></div>' +
    (state.pushOn
      ? '<button class="btn small ghost" onclick="App.disablePush()">关闭</button>'
      : '<button class="btn small" onclick="App.enablePush()">开启</button>') +
    '</div>' +
    (!state.pushOn && isIOS() ? '<div class="muted ios-hint">📱 iPhone：先用 Safari「添加到主屏幕」，从桌面图标打开后再开启</div>' : '') +
    '</div>' +

    '<div class="card ledger-entry" onclick="App.createMigration()">' +
    '<span class="pn-bell">🔑</span>' +
    '<div class="le-body"><b>换设备 / 迁移账号</b>' +
    '<div class="muted">添加到主屏幕或换手机后，用迁移码找回记录</div></div>' +
    '<span class="rc-arrow">▸</span></div>' +

    '<div class="section-title">' + sprite('heart', 2) + ' 我们的私房菜</div>' +
    '<div class="card">' +
    '<div class="form-label">起个菜名</div>' +
    '<input class="input" placeholder="比如：妈妈牌红烧鱼" maxlength="20" value="' + esc(state.newDishName) + '" oninput="App.onDishNameInput(this)">' +
    '<div class="form-label">选个图标</div>' + emojiGrid +
    '<button class="btn wide" style="margin-top:16px" onclick="App.addDish()">＋ 加入菜单</button>' +
    '</div>' + dishList +

    '<div class="footer-note">💕 用心点菜，用爱做饭</div>'
}

function renderAll() {
  renderHome()
  renderMenu()
  renderCook()
  renderMine()
  renderHistory()
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === state.tab)
  })
  document.querySelectorAll('.screen').forEach((s) => {
    s.hidden = s.id !== 'screen-' + state.tab
  })
}

/* ================= 交互 ================= */
const App = {
  switchTab(tab) {
    state.tab = tab
    renderAll()
    window.scrollTo(0, 0)
  },

  async chooseRole(role) {
    try {
      await api('setProfile', { role })
      await refresh()
    } catch (e) { toast(e.message) }
  },

  onJoinInput(el) { state.joinCode = el.value },
  onNickInput(el) { state.nickname = el.value },
  onDishNameInput(el) { state.newDishName = el.value },
  onNoteInput(el) { state.note = el.value },

  async createCouple() {
    try {
      await api('createCouple')
      await refresh()
    } catch (e) { toast(e.message) }
  },

  async joinCouple() {
    const code = state.joinCode.trim()
    if (!code) return toast('先输入邀请码哦')
    try {
      await api('joinCouple', { code })
      toast('配对成功 💕')
      state.joinCode = ''
      await refresh()
    } catch (e) { toast(e.message) }
  },

  copyCode() {
    if (state.couple) copyText(state.couple.code, '邀请码已复制，快发给TA吧 💌')
  },

  shareInvite() {
    if (!state.couple) return
    copyText('来和我一起用「情侣点菜」吧！打开 ' + location.origin + location.pathname + ' 输入邀请码 ' + state.couple.code + ' 就能绑定～', '邀请链接已复制，去发给TA吧 💌')
  },

  async accept(id) {
    try {
      await api('updateWish', { id, status: 'cooking' })
      toast('接单成功，快去做饭吧 🍳')
      loadWishes()
    } catch (e) { toast(e.message) }
  },

  async finish(id) {
    try {
      await api('updateWish', { id, status: 'done' })
      toast('上菜啦，开动 😋')
      loadWishes()
    } catch (e) { toast(e.message) }
  },

  async removeWish(id) {
    if (!window.confirm('不想吃这道了吗？删除后TA就看不到啦')) return
    try {
      await api('deleteWish', { id })
      loadWishes()
    } catch (e) { toast(e.message) }
  },

  switchCat(i) {
    state.activeCat = i
    renderMenu()
  },

  toggleDishEl(el) {
    const name = el.dataset.name
    const emoji = el.dataset.emoji
    if (state.selected[name]) delete state.selected[name]
    else state.selected[name] = emoji
    renderMenu()
  },

  randomPick() {
    const all = []
    allCats().forEach((c) => c.items.forEach((d) => { if (!state.selected[d.name]) all.push(d) }))
    if (!all.length) return toast('菜都被你选完啦！')
    const d = all[Math.floor(Math.random() * all.length)]
    state.selected[d.name] = d.emoji
    renderMenu()
    toast('🎲 命运选中了「' + d.name + '」')
  },

  openConfirm() {
    const names = Object.keys(state.selected)
    if (!names.length) return toast('先选几道想吃的菜呀 🥺')
    if (!state.couple || !state.couple.paired) {
      toast('先去首页和TA配对，TA才能看到哦')
      state.tab = 'home'
      renderAll()
      return
    }
    const mask = $('#sheet-mask')
    let chips = ''
    names.forEach((n) => {
      chips += '<span class="pick-chip" data-name="' + esc(n) + '" onclick="App.removeSelected(this)">' + esc(state.selected[n]) + ' ' + esc(n) + ' ✕</span>'
    })
    mask.innerHTML =
      '<div class="sheet">' +
      '<h3>确认一下今天想吃的 😋</h3>' +
      '<div class="chips">' + chips + '</div>' +
      '<input class="input" placeholder="给TA留句话：少放辣，多放爱 🌶️❤️" maxlength="50" value="' + esc(state.note) + '" oninput="App.onNoteInput(this)">' +
      '<div class="btn-row">' +
      '<button class="btn ghost" onclick="App.closeConfirm()">再想想</button>' +
      '<button class="btn" onclick="App.submitOrder()">下单 💕</button>' +
      '</div></div>'
    mask.hidden = false
    mask.onclick = (e) => { if (e.target === mask) App.closeConfirm() }
  },

  closeConfirm() {
    $('#sheet-mask').hidden = true
  },

  removeSelected(el) {
    const name = el.dataset.name
    delete state.selected[name]
    if (!Object.keys(state.selected).length) {
      this.closeConfirm()
      renderMenu()
      return
    }
    this.openConfirm()
    renderMenu()
  },

  async submitOrder() {
    const items = Object.keys(state.selected).map((n) => ({ name: n, emoji: state.selected[n] }))
    try {
      await api('addWishes', { items, note: state.note })
      state.selected = {}
      state.note = ''
      this.closeConfirm()
      toast('点菜成功，TA马上就能看到 💕')
      await loadWishes()
      setTimeout(() => this.switchTab('home'), 900)
    } catch (e) { toast(e.message) }
  },

  async saveNickname() {
    try {
      await api('setProfile', { nickname: state.nickname })
      toast('保存好啦 ✨')
      await refresh()
    } catch (e) { toast(e.message) }
  },

  async unbind() {
    if (!window.confirm('确定要解除绑定吗？解绑后你们都看不到对方的菜单了')) return
    try {
      await api('unbind')
      toast('已解除绑定')
      await refresh()
    } catch (e) { toast(e.message) }
  },

  pickEmoji(e) {
    state.newDishEmoji = e
    renderMine()
  },

  async addDish() {
    const name = state.newDishName.trim()
    if (!name) return toast('给这道菜起个名字吧～')
    try {
      await api('addDish', { name, emoji: state.newDishEmoji })
      toast('私房菜添加成功 💝')
      state.newDishName = ''
      state.dishes = await api('listDishes')
      renderMine()
      renderMenu()
    } catch (e) { toast(e.message) }
  },

  async deleteDish(id) {
    if (!window.confirm('删除这道私房菜？')) return
    try {
      await api('deleteDish', { id })
      state.dishes = await api('listDishes')
      renderMine()
      renderMenu()
    } catch (e) { toast(e.message) }
  },

  /* ---- 拍照记录 ---- */
  pickPhoto(id) {
    state.photoWishId = id
    const input = $('#photo-input')
    input.value = ''
    input.click()
  },

  async onPhotoChange(input) {
    const file = input.files && input.files[0]
    if (!file || !state.photoWishId) return
    toast('📷 压缩照片中...')
    try {
      const dataUrl = await compressPhoto(file)
      toast('⬆️ 上传中...')
      await api('uploadPhoto', { id: state.photoWishId, image: dataUrl })
      state.photoWishId = ''
      state.history = null
      toast('照片记进小账本啦 📷✨')
      await loadWishes()
    } catch (e) { toast(e.message) }
  },

  viewPhotoSrc(el) {
    const mask = $('#sheet-mask')
    mask.innerHTML = '<div class="photo-view"><img src="' + esc(el.src) + '" alt="菜品照片"><div class="pv-hint">点空白处关闭</div></div>'
    mask.hidden = false
    mask.onclick = () => App.closeConfirm()
  },

  /* ---- 推送通知 ---- */
  async enablePush() {
    if (LOCAL.enabled) return toast('演示模式不支持推送，部署后从手机打开就能开啦')
    if (!pushSupported()) {
      return toast(isIOS()
        ? '先用 Safari「添加到主屏幕」，从桌面图标打开后再开启哦'
        : '这个浏览器不支持推送通知')
    }
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return toast('没拿到通知权限，去浏览器设置里允许一下')
      const reg = await navigator.serviceWorker.register('sw.js')
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(VAPID_PUBLIC_KEY)
      })
      await api('savePushSub', { sub: sub.toJSON() })
      state.pushOn = true
      localStorage.setItem('lm_push_nudge', 'off')
      toast('提醒开启啦 🔔 TA的动态会通知你')
      renderHome()
      renderMine()
    } catch (e) { toast('开启失败：' + e.message) }
  },

  async disablePush() {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg && (await reg.pushManager.getSubscription())
      if (sub) await sub.unsubscribe()
      await api('removePushSub')
      state.pushOn = false
      toast('提醒已关闭')
      renderHome()
      renderMine()
    } catch (e) { toast(e.message) }
  },

  dismissPushNudge() {
    localStorage.setItem('lm_push_nudge', 'off')
    renderHome()
  },

  /* ---- 设备迁移 ---- */
  onMigInput(el) { state.migCode = el.value },

  async createMigration() {
    if (LOCAL.enabled) return toast('演示模式没有账号，部署后才需要迁移哦')
    try {
      const r = await api('createMigration')
      const mask = $('#sheet-mask')
      mask.innerHTML =
        '<div class="sheet"><h3>设备迁移码 🔑</h3>' +
        '<div class="code-show" onclick="App.copyMig(\'' + esc(r.code) + '\')">' + esc(r.code) + '</div>' +
        '<p class="mig-tip">在新设备（比如添加到主屏幕后的 App）打开网站，点「用迁移码找回账号」输入这个码，绑定和记录就都回来啦。<br><b>30 分钟内有效，用一次就失效。</b></p>' +
        '<div class="btn-row">' +
        '<button class="btn ghost" onclick="App.closeConfirm()">关闭</button>' +
        '<button class="btn" onclick="App.copyMig(\'' + esc(r.code) + '\')">复制迁移码</button>' +
        '</div></div>'
      mask.hidden = false
      mask.onclick = (e) => { if (e.target === mask) App.closeConfirm() }
    } catch (e) { toast(e.message) }
  },

  copyMig(code) {
    copyText(code, '迁移码已复制 🔑 去新设备输入吧')
  },

  openRestore() {
    state.migCode = ''
    const mask = $('#sheet-mask')
    mask.innerHTML =
      '<div class="sheet"><h3>用迁移码找回账号 🔑</h3>' +
      '<p class="mig-tip">在<b>旧设备</b>（原来用的浏览器）打开网站：<br>「我的」→「换设备 / 迁移账号」→ 生成迁移码</p>' +
      '<input class="input code-input" maxlength="6" placeholder="输入 6 位迁移码" oninput="App.onMigInput(this)">' +
      '<div class="btn-row">' +
      '<button class="btn ghost" onclick="App.closeConfirm()">取消</button>' +
      '<button class="btn" onclick="App.claimMigration()">找回账号</button>' +
      '</div></div>'
    mask.hidden = false
    mask.onclick = (e) => { if (e.target === mask) App.closeConfirm() }
  },

  async claimMigration() {
    const code = state.migCode.trim()
    if (!code) return toast('先输入迁移码哦')
    if (LOCAL.enabled) return toast('演示模式不支持迁移，部署后可用')
    try {
      const r = await api('claimMigration', { code })
      uid = r.uid
      localStorage.setItem('lm_uid', uid)
      state.migCode = ''
      state.history = null
      this.closeConfirm()
      toast('账号找回啦，欢迎回家 💕')
      await refresh()
    } catch (e) { toast(e.message) }
  },

  /* ---- 点菜小账本 ---- */
  async openHistory() {
    if (!state.couple || !state.couple.paired) {
      toast('先绑定另一半，账本才会开张哦 💕')
      return
    }
    state.tab = 'history'
    renderAll()
    window.scrollTo(0, 0)
    try {
      const r = await api('listHistory')
      state.history = r.entries || []
      renderHistory()
    } catch (e) {
      toast(e.message)
    }
  },

  /* ---- 下厨房 ---- */
  toggleIng(name) {
    if (state.cookSel[name]) delete state.cookSel[name]
    else state.cookSel[name] = true
    renderCook()
  },

  toggleTool(name) {
    if (state.cookTools[name]) delete state.cookTools[name]
    else state.cookTools[name] = true
    renderCook()
  },

  setStrict(v) {
    state.cookStrict = v
    renderCook()
  },

  clearCook() {
    state.cookSel = {}
    state.cookTools = {}
    renderCook()
  },

  openRecipe(name) {
    openRecipeSheet(name)
  },

  openRecipeFromEl(event, el) {
    event.stopPropagation()
    openRecipeSheet(el.dataset.name)
  },

  async cookToMenu(name) {
    const r = window.COOK.recipes[name]
    if (!r) return
    if (!state.couple || !state.couple.paired) {
      this.closeConfirm()
      toast('先去首页和TA配对，TA才能看到哦')
      state.tab = 'home'
      renderAll()
      return
    }
    try {
      await api('addWishes', { items: [{ name, emoji: r.emoji }], note: '' })
      this.closeConfirm()
      toast('「' + name + '」已加入今日菜单 💕')
      await loadWishes()
    } catch (e) { toast(e.message) }
  }
}
window.App = App

/* ================= 启动 ================= */
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => App.switchTab(t.dataset.tab))
})
document.querySelectorAll('.tab-icon').forEach((el) => {
  const icons = { home: 'heart', menu: 'bowl', cook: 'pot', mine: 'face' }
  el.innerHTML = sprite(icons[el.dataset.icon], 3)
})

renderAll()
refresh()

// 注册 Service Worker（推送 + PWA），file:// 或不支持时静默跳过
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => checkPush()).catch(() => {})
}

// 轮询：首页每 8 秒刷新心愿单；等待配对时每 5 秒检查
setInterval(() => {
  if (document.visibilityState !== 'visible') return
  if (state.couple && state.couple.paired) {
    if (state.tab === 'home') loadWishes()
  } else if (state.couple && !state.couple.paired) {
    refresh()
  }
}, 8000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.loaded) refresh()
})
