const MAX_EDGE = 1920;
const MAX_BYTES = 5 * 1024 * 1024;

function guessMime(file) {
  const type = String(file?.type || '').toLowerCase();
  if (type && type !== 'application/octet-stream') return type;
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic';
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'image/jpeg';
}

function safeName(file, mime) {
  const raw = String(file?.name || '').trim();
  if (raw && !/^(blob|image|undefined|null)$/i.test(raw)) {
    return raw.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 80);
  }
  const ext =
    mime === 'image/png'
      ? 'png'
      : mime === 'application/pdf'
        ? 'pdf'
        : mime === 'image/webp'
          ? 'webp'
          : 'jpg';
  return `foto-${Date.now()}.${ext}`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem.'))),
      type,
      quality
    );
  });
}

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return { bitmap: await createImageBitmap(file), close: true };
    } catch {
      /* HEIC/alguns Androids caem no <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a foto.'));
      el.src = url;
    });
    return { bitmap: img, close: false };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compressToJpeg(file) {
  const { bitmap, close } = await loadImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.82;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    while (blob.size > MAX_BYTES && quality > 0.45) {
      quality -= 0.12;
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }
    const name = safeName(file, 'image/jpeg').replace(/\.[^.]+$/, '.jpg');
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    if (close && typeof bitmap.close === 'function') bitmap.close();
  }
}

/**
 * Cópia estável do File (iOS invalida o blob se o input for limpo)
 * e compressão de fotos da câmera para caber no upload.
 */
export async function prepareUploadFile(file) {
  if (!file) return file;
  const mime = guessMime(file);
  const buffer = await file.arrayBuffer();
  const cloned = new File([buffer], safeName(file, mime), {
    type: mime,
    lastModified: file.lastModified || Date.now(),
  });

  if (!mime.startsWith('image/') || mime === 'image/svg+xml') return cloned;
  try {
    return await compressToJpeg(cloned);
  } catch {
    return cloned;
  }
}
