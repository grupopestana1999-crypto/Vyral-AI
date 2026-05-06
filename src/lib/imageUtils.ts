// Reduz uma imagem do upload pra max 1280px (lado maior) e re-encoda como JPEG ~85%.
// Foto de iPhone 12MP cai de ~5-10MB pra ~150-300KB com qualidade visual indistinguível pra IA.
// HEIC/HEIF (formato padrão iPhone): Chrome/Firefox não decodificam nativamente —
// converter pra JPEG via heic2any antes (lazy import pra não inflar bundle).
export async function resizeImageFile(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  const isHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.type === '' && /\.(heic|heif)$/i.test(file.name)
  let workingFile = file
  if (isHeic) {
    try {
      const { default: heic2any } = await import('heic2any')
      const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
      const converted = Array.isArray(result) ? result[0] : result
      workingFile = new File(
        [converted],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      )
    } catch (e) {
      throw new Error(
        'Foto HEIC/HEIF (formato iPhone) não pôde ser convertida. ' +
        'Salve como JPG e tente novamente, ou ajuste o iPhone em Ajustes > Câmera > Formatos > "Mais Compatível".'
      )
    }
  }
  const blobUrl = URL.createObjectURL(workingFile)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error(
        'Não consegui ler essa imagem. Use JPG ou PNG. Se for foto do iPhone, ' +
        'salve como JPG primeiro ou mude Ajustes > Câmera > Formatos > "Mais Compatível".'
      ))
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
