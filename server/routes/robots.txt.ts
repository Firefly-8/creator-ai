export default defineEventHandler((event) => {
  const disableIndex = process.env.NUXT_PUBLIC_DISABLE_INDEX === 'true'

  // 测试环境：禁止所有爬虫
  if (disableIndex) {
    setHeader(event, 'Content-Type', 'text/plain')
    return [
      'User-Agent: *',
      'Disallow: /',
      '',
    ].join('\n')
  }

  // 生产环境：允许正常爬取
  setHeader(event, 'Content-Type', 'text/plain')
  return [
    'User-Agent: *',
    'Disallow:',
    'Allow: /',
    '',
  ].join('\n')
})
