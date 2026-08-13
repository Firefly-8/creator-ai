export default defineEventHandler((event) => {
  const nodeEnv = process.env.NODE_ENV || 'production'

  // test/staging 分支：禁止所有爬虫
  if (nodeEnv !== 'production') {
    setHeader(event, 'Content-Type', 'text/plain')
    return [
      'User-Agent: *',
      'Disallow: /',
      '',
    ].join('\n')
  }

  // master/production 分支：允许正常爬取
  setHeader(event, 'Content-Type', 'text/plain')
  return [
    'User-Agent: *',
    'Disallow:',
    'Allow: /',
    '',
  ].join('\n')
})
