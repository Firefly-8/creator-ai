/**
 * 登录弹窗链路守卫
 *
 * ⚠️ 背景（2026-10-21）：
 *   `pages/cards.vue` 以前自己画了一个 "Almost there" 弹窗。
 *   它 Teleport 到 body 之后**脱离了 .ck-cards 的 CSS 变量作用域**
 *   （--ck-ink / --ck-coral / --ck-line 全部取不到）→
 *     · 标题变浅灰、正文几乎看不见
 *     · 主按钮 `background: var(--ck-coral)` 失效 → 白底
 *       + `color: #fff` → 白底白字，按钮整个消失
 *   于是「最后一步点生成」弹出来的东西像坏了一样。
 *
 *   正确做法：用全站共用的 `<AuthModal>`（layouts/* 里已挂载），
 *   它自带一套浅色变量 + 焦点陷阱 + Google 登录。
 *
 * 这个测试锁住：
 *   1. 页面里不许再出现自己画的 .ck-modal 弹窗
 *   2. 需要登录的流程走共享的 useAuthModal
 *   3. 「登录成功后接着做」的回调只能触发一次
 *   4. note（弹窗上的上下文说明）默认不显示
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthModal } from '../composables/useAuthModal'

const ROOT = process.cwd()
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

const cardsPage = read('pages/cards.vue')
const authModal = read('components/auth/AuthModal.vue')

describe('登录弹窗：页面不再自绘弹窗', () => {
  it('pages/cards.vue 不再有自己的 .ck-modal 弹窗', () => {
    expect(cardsPage).not.toMatch(/class="ck-modal/)
    expect(cardsPage).not.toMatch(/\.ck-modal__/)
  })

  it('pages/cards.vue 走共享的 useAuthModal', () => {
    expect(cardsPage).toContain('useAuthModal()')
    expect(cardsPage).toContain('openAuthForGenerate')
  })

  it('未登录 401 时走的是共享弹窗，不是本地 ref', () => {
    expect(cardsPage).not.toContain('needLogin')
  })
})

describe('登录弹窗：AuthModal 组件', () => {
  it('会显示 note（上下文说明）', () => {
    expect(authModal).toContain('v-if="note"')
    expect(authModal).toContain('ck-auth__note')
  })

  it('顶部不再有 Sign in / Create an account 标签页（底部链接是唯一切换入口）', () => {
    expect(authModal).not.toContain('ck-auth__tabs')
    expect(authModal).not.toContain('ck-auth__tab')
    expect(authModal).not.toContain('role="tablist"')
    expect(authModal).toContain('ck-auth__switch-btn')
  })

  it('底部只留一个隐私协议链接（不再是一整段话）', () => {
    expect(authModal).toContain('ck-auth__privacy')
    expect(authModal).toContain('to="/privacy"')
    expect(authModal).not.toContain('We never publish them')
    expect(authModal).not.toContain('send newsletters')
  })

  it('登录成功后取走并执行 afterAuth 回调', () => {
    expect(authModal).toContain('consumeAfterAuth')
    expect(authModal).toContain('await done()')
  })

  it('关闭弹窗时会清掉 note 和回调（不会误触发别的页面）', () => {
    expect(authModal).toContain('clearNote()')
    expect(authModal).toContain('clearAfterAuth()')
  })

  it('每次打开都按 initialMode 重置标签（否则手动切过会串味）', () => {
    // 只 watch props.initialMode 是不够的 —— 它只在**值变化**时才触发。
    // 必须 watch(isOpen) 时按共享的 initialMode 重置。
    expect(authModal).toMatch(/watch\(isOpen[\s\S]{0,400}mode\.value = initialMode\.value/)
  })
})

describe('useAuthModal：一次性回调', () => {
  const modal = useAuthModal()

  beforeEach(() => {
    modal.clearNote()
    modal.clearAfterAuth()
  })

  it('note 默认是空的（别的页面不受影响）', () => {
    expect(modal.note.value).toBe('')
  })

  it('setNote / clearNote 生效', () => {
    modal.setNote('Sign in to continue')
    expect(modal.note.value).toBe('Sign in to continue')
    modal.clearNote()
    expect(modal.note.value).toBe('')
  })

  it('consumeAfterAuth 只能取一次 —— 回调不会重复触发', () => {
    let hits = 0
    modal.setAfterAuth(() => { hits += 1 })
    const first = modal.consumeAfterAuth()
    expect(typeof first).toBe('function')
    first?.()
    const second = modal.consumeAfterAuth()
    expect(second).toBeNull()
    expect(hits).toBe(1)
  })

  it('clearAfterAuth 能丢掉没来得及用的回调', () => {
    let hits = 0
    modal.setAfterAuth(() => { hits += 1 })
    modal.clearAfterAuth()
    expect(modal.consumeAfterAuth()).toBeNull()
    expect(hits).toBe(0)
  })
})
