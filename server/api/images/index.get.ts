export default defineEventHandler(() => {
  return {
    images: listImages(80).map(publicImage),
  }
})
