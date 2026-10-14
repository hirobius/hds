/** @internal — live helper for scripts/eval-refs.mjs. Drives a browser; not imported by `pnpm test`. */
/**
 * Decode and scale an image in Chromium, so a PNG, JPEG, WebP or AVIF from a
 * phone needs no image library: draw it on a canvas at the target width and
 * read the pixels back (for fidelity.mjs) or a JPEG data URI (for the board).
 * HEIC does not decode in Chromium; the error says to re-save the image as
 * PNG or JPEG.
 */

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
};

/** `image/png` for `shot.PNG`; null for a type Chromium cannot draw. */
export function mimeFor(file) {
  const ext = String(file).split('.').pop().toLowerCase();
  return MIME[ext] ?? null;
}

async function draw(page, buf, mime, width, out) {
  return page.evaluate(
    async ({ b64, mime: type, width: w, out: kind }) => {
      const img = new Image();
      img.src = `data:${type};base64,${b64}`;
      await img.decode();
      const scale = w / img.naturalWidth;
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      if (kind === 'jpeg') return { uri: canvas.toDataURL('image/jpeg', 0.82) };
      return { width: w, height: h, data: Array.from(ctx.getImageData(0, 0, w, h).data) };
    },
    { b64: buf.toString('base64'), mime, width, out },
  );
}

/**
 * @param {import('playwright').Browser} browser
 * @param {Buffer} buf image bytes
 * @param {string} mime from mimeFor
 * @param {{ width:number, out:'pixels'|'jpeg' }} opts
 */
export async function scaleImage(browser, buf, mime, { width, out }) {
  if (!mime) {
    throw new Error(
      'unsupported image type: re-save it as PNG or JPEG (HEIC does not decode in Chromium)',
    );
  }
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.setContent('<!doctype html><title>scale</title>');
    const r = await draw(page, buf, mime, width, out);
    return out === 'jpeg'
      ? r.uri
      : { width: r.width, height: r.height, data: Uint8Array.from(r.data) };
  } catch (err) {
    throw new Error(`could not decode the image (${String(err.message).split('\n')[0]})`);
  } finally {
    await context.close();
  }
}
