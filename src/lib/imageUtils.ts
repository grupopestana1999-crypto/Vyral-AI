// Reduz uma imagem do upload pra max 1280px (lado maior) e re-encoda como JPEG ~85%.
// Foto de iPhone 12MP cai de ~5-10MB pra ~150-300KB com qualidade visual indistinguível pra IA.
export async function resizeImageFile(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  const blobUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Falha ao decodificar imagem'))
      i.src = blobUrl
    })

    let w = img.naturalWidth
    let h = img.naturalHeight
    if (w > maxDim || h > maxDim) {
      if (w >= h) { h = Math.round((h / w) * maxDim); w = maxDim }
      else { w = Math.round((w / h) * maxDim); h = maxDim }
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}
