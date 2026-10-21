/**
 * 站点主体信息（法律实体 / 联系方式 / 营业地址）
 *
 * ⚠️ 2026-10-21：PayPal 商家账号审核会**逐条核对**下面这些信息，
 *    必须和营业执照、身份证、PayPal 后台填的**完全一致**，否则会被驳回或冻结。
 *
 *    下面标了 TODO 的字段**必须由你填真实信息** —— 我不能编，
 *    填错会导致 PayPal 审核不通过 / 后续被要求退款。
 *
 *    改完这一处，隐私政策、条款、退款政策、页脚、联系页会同步更新 ✅
 */
export const SITE_INFO = {
  /** 品牌名（对外展示用） */
  brand: 'Create Keepsakes',

  /**
   * TODO ⚠️ 填 PayPal 后台用的**同一个**法律实体名。
   * 中国大陆如果注册了公司，就用营业执照上的全称；
   * 如果是个人经营者，PayPal 中国会让你走「贝宝支付（北京）有限公司」的
   * 签约流程，主体名要跟那个流程里的一致。
   */
  legalName: 'TODO: 你的法律实体全称（与营业执照 / PayPal 后台一致）',

  /**
   * TODO ⚠️ 填营业地址 —— PayPal 审核必查，页面上要能看到。
   * 不需要门牌号精确到房间，但城市/省/国家要和营业执照一致。
   */
  address: {
    line1: 'TODO: 地址第一行',
    city: 'TODO: 城市',
    region: 'TODO: 省 / 州',
    postalCode: 'TODO: 邮编',
    country: 'TODO: 国家（两位国家码，如 CN / US）',
  },

  /** 客服邮箱（对外可见） */
  supportEmail: 'hello@yozzytools.com',
  /** 隐私相关 */
  privacyEmail: 'privacy@yozzytools.com',
  /** 退款相关 —— PayPal 审核会看这个邮箱能不能收信 */
  refundEmail: 'refunds@yozzytools.com',

  /** 正式站域名（PayPal 审核时填这个） */
  siteUrl: 'https://create.yozzytools.com',

  /** 商家所在国家/地区（PayPal 后台选国家时用） */
  merchantCountry: 'TODO: 商家国家/地区',
}

/** 拼成一行地址（页面上显示） */
export function formatAddress(): string {
  const a = SITE_INFO.address
  return [a.line1, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', ')
}

/** 这个站点信息填好了没 —— 填了才能过 PayPal 审核 */
export function siteInfoComplete(): boolean {
  return (
    !SITE_INFO.legalName.startsWith('TODO') &&
    !SITE_INFO.address.line1.startsWith('TODO') &&
    !SITE_INFO.merchantCountry.startsWith('TODO')
  )
}
