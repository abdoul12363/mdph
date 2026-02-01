import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function wrapText(font, text, fontSize, maxWidth) {
  const cleaned = String(text ?? '').replace(/\r\n/g, '\n');
  const paragraphs = cleaned.split('\n');
  const lines = [];

  for (const p of paragraphs) {
    const trimmed = p.trimEnd();
    if (trimmed === '') {
      lines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/g);
    let current = '';

    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, fontSize);

      if (width <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
        current = w;
        continue;
      }

      let chunk = '';
      for (const ch of w) {
        const cand2 = chunk + ch;
        if (font.widthOfTextAtSize(cand2, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = cand2;
        }
      }
      if (chunk) {
        current = chunk;
      }
    }

    if (current) lines.push(current);
  }

  return lines;
}

function rectToBox(rect) {
  if (!rect) return null;

  if (
    typeof rect === 'object' &&
    rect.x !== undefined &&
    rect.y !== undefined &&
    rect.width !== undefined &&
    rect.height !== undefined
  ) {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  if (
    typeof rect === 'object' &&
    typeof rect.size === 'function' &&
    typeof rect.get === 'function' &&
    rect.size() >= 4
  ) {
    const n0 = rect.get(0);
    const n1 = rect.get(1);
    const n2 = rect.get(2);
    const n3 = rect.get(3);
    const x1 = typeof n0?.asNumber === 'function' ? n0.asNumber() : Number(n0);
    const y1 = typeof n1?.asNumber === 'function' ? n1.asNumber() : Number(n1);
    const x2 = typeof n2?.asNumber === 'function' ? n2.asNumber() : Number(n2);
    const y2 = typeof n3?.asNumber === 'function' ? n3.asNumber() : Number(n3);
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    return { x, y, width, height };
  }

  return null;
}

function resolveWidgetPageIndex(pdfDoc, widget) {
  const pages = pdfDoc.getPages();
  const pageRef =
    (typeof widget?.P === 'function' ? widget.P() : null) ||
    (typeof widget?.getP === 'function' ? widget.getP() : null);
  if (!pageRef) return 0;

  for (let i = 0; i < pages.length; i += 1) {
    const pref = pages[i]?.ref || pages[i]?.node?.ref;
    if (pref && pref === pageRef) return i;
    if (pref && pageRef && String(pref) === String(pageRef)) return i;
  }

  return 0;
}

function getFieldBoxAndPageIndex(pdfDoc, form, fieldName) {
  const field = form.getTextField(fieldName);
  const widgets = field.acroField.getWidgets();
  const widget = widgets && widgets.length ? widgets[0] : null;
  if (!widget) return null;

  const rect = typeof widget.getRectangle === 'function' ? widget.getRectangle() : null;
  const box = rectToBox(rect);
  const pageIndex = resolveWidgetPageIndex(pdfDoc, widget);
  if (!box) return null;
  return { box, pageIndex };
}

function buildStyledLines(fontRegular, fontBold, contentMaxWidth, titleSize, bodySize, blocks) {
  const out = [];
  for (const b of blocks) {
    const titleText = String(b.title ?? '').trim();
    if (titleText) {
      const titleLines = wrapText(fontBold, titleText, titleSize, contentMaxWidth);
      for (const ln of titleLines) out.push({ text: ln, bold: true, size: titleSize });
      out.push({ text: '', bold: false, size: bodySize });
    }

    const bodyText = String(b.body ?? '').trim();
    const bodyLines = wrapText(fontRegular, bodyText || ' ', bodySize, contentMaxWidth);
    for (const ln of bodyLines) out.push({ text: ln, bold: false, size: bodySize });
    if (titleText) out.push({ text: '', bold: false, size: bodySize });
  }
  return out;
}

function drawLinesIntoBox(page, box, lines, fonts) {
  const padding = { left: 4, right: 4, top: 4, bottom: 4 };
  const x = box.x + padding.left;
  const maxWidth = box.width - padding.left - padding.right;
  const yTop = box.y + box.height - padding.top;
  const yMin = box.y + padding.bottom;

  let y = yTop;
  let i = 0;

  for (; i < lines.length; i += 1) {
    const ln = lines[i];
    const font = ln.bold ? fonts.bold : fonts.regular;
    const lineHeight = Math.round(ln.size * 1.25);

    if (y - lineHeight < yMin) break;

    if (ln.text !== '') {
      page.drawText(ln.text, {
        x,
        y: y - ln.size,
        size: ln.size,
        font,
        maxWidth,
      });
    }

    y -= lineHeight;
  }

  return lines.slice(i);
}

async function loadPoppinsSemiBold(pdfDoc, fallbackFont) {
  try {
    const poppinsSemiBoldPath = path.join(process.cwd(), 'src/fonts/Poppins-SemiBold.ttf');
    if (fs.existsSync(poppinsSemiBoldPath)) {
      const poppinsSemiBoldBytes = fs.readFileSync(poppinsSemiBoldPath);
      return await pdfDoc.embedFont(poppinsSemiBoldBytes);
    }

    const poppinsBoldPath = path.join(process.cwd(), 'src/fonts/Poppins-Bold.ttf');
    if (fs.existsSync(poppinsBoldPath)) {
      const poppinsBoldBytes = fs.readFileSync(poppinsBoldPath);
      return await pdfDoc.embedFont(poppinsBoldBytes);
    }
  } catch {
  }

  return fallbackFont;
}

async function maybeRegisterFontkit(pdfDoc) {
  try {
    const fontkitModule = await import('fontkit');
    const fontkitInstance = fontkitModule?.default || fontkitModule;
    if (fontkitInstance) pdfDoc.registerFontkit(fontkitInstance);
  } catch {
  }
}

export async function generateProjetDeViePdf({ pdfPath, prenom, nom, blocks }) {
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    throw new Error('PDF introuvable sur le serveur.');
  }

  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  await maybeRegisterFontkit(pdfDoc);
  const fontPoppinsSemiBold = await loadPoppinsSemiBold(pdfDoc, fontBold);

  const text1Target = getFieldBoxAndPageIndex(pdfDoc, form, 'Text1');
  const text2Target = getFieldBoxAndPageIndex(pdfDoc, form, 'Text2');
  const text4Target = getFieldBoxAndPageIndex(pdfDoc, form, 'Text4');

  if (!text2Target || !text4Target) {
    throw new Error('Champs PDF Text2/Text4 introuvables ou non exploitables.');
  }

  try {
    form.getTextField('Text1').setText('');
    form.getTextField('Text2').setText('');
    form.getTextField('Text4').setText('');
  } catch {
  }

  try {
    form.updateFieldAppearances(fontRegular);
  } catch {
  }

  try {
    form.flatten();
  } catch {
  }

  const titleSize = 12;
  const bodySize = 11;
  const maxWidthText2 = Math.max(10, text2Target.box.width - 8);
  const lines = buildStyledLines(fontRegular, fontBold, maxWidthText2, titleSize, bodySize, blocks);

  const pages = pdfDoc.getPages();

  if (text1Target) {
    const page1 = pages[text1Target.pageIndex] || pages[0];
    const nameParts = [String(nom || '').trim(), String(prenom || '').trim()].filter(Boolean);
    const raw = nameParts.join(' ').trim();
    const text1 = raw ? `${raw},` : '';

    if (text1) {
      const padding = 4;
      const maxWidth = Math.max(10, text1Target.box.width - padding * 2);
      let size = 28;
      const measureFont = fontPoppinsSemiBold || fontBold;
      while (size > 12 && measureFont.widthOfTextAtSize(text1, size) > maxWidth) {
        size -= 1;
      }

      const x = text1Target.box.x + padding;
      const y = text1Target.box.y + (text1Target.box.height - size) / 2;

      page1.drawText(text1, {
        x,
        y,
        size,
        font: fontPoppinsSemiBold,
        color: rgb(0 / 255, 45 / 255, 95 / 255),
      });
    }
  }

  const page2 = pages[text2Target.pageIndex] || pages[0];
  const page4 = pages[text4Target.pageIndex] || pages[0];

  const remaining = drawLinesIntoBox(page2, text2Target.box, lines, { regular: fontRegular, bold: fontBold });
  if (remaining.length > 0) {
    drawLinesIntoBox(page4, text4Target.box, remaining, { regular: fontRegular, bold: fontBold });
  }

  return await pdfDoc.save();
}
