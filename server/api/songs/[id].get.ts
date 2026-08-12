
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  const song = getSong(id)
  if (!song) throw createError({ statusCode: 404, statusMessage: 'Song not found' })
  return { song: publicSong(song) }
})
