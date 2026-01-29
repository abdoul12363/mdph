import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function pickString(obj, key) {
  if (!obj || typeof obj !== 'object') return '';
  const v = obj[key];
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return '';
  return String(v);
}

function pickFirstString(obj, keys) {
  for (const k of keys) {
    const v = pickString(obj, k);
    if (String(v || '').trim() !== '') return v;
  }
  return '';
}

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

      // mot trop long: fallback simple en coupant caractère par caractère
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

  if (typeof rect === 'object' && rect.x !== undefined && rect.y !== undefined && rect.width !== undefined && rect.height !== undefined) {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  if (typeof rect === 'object' && typeof rect.size === 'function' && typeof rect.get === 'function' && rect.size() >= 4) {
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
  const pageRef = (typeof widget?.P === 'function' ? widget.P() : null) || (typeof widget?.getP === 'function' ? widget.getP() : null);
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
    const titleLines = wrapText(fontBold, b.title, titleSize, contentMaxWidth);
    for (const ln of titleLines) out.push({ text: ln, bold: true, size: titleSize });
    out.push({ text: '', bold: false, size: bodySize });

    const bodyText = String(b.body ?? '').trim();
    const bodyLines = wrapText(fontRegular, bodyText || ' ', bodySize, contentMaxWidth);
    for (const ln of bodyLines) out.push({ text: ln, bold: false, size: bodySize });
    out.push({ text: '', bold: false, size: bodySize });
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    const root = process.cwd();
    const pdfPath = path.join(root, 'public', 'pdf', 'mdph-projet-de-vie.pdf');

    if (!fs.existsSync(pdfPath)) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'PDF introuvable sur le serveur.' }));
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const prenom = pickFirstString(body, ['prenom', 'prenom:']);
    const nom = pickFirstString(body, ['nom', 'nom:']);

    const impactQuotidien = pickString(body, 'impact_quotidien');
    const impactTravail = pickString(body, 'description_impact_travail');
    const explicationComplementaire = pickString(body, 'explication_demande');
    const aspirations = pickString(body, 'projet_vie');

    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Charger fontkit seulement si disponible (requis pour embed une police .ttf)
    try {
      const fontkitModule = await import('fontkit');
      const fontkitInstance = fontkitModule?.default || fontkitModule;
      if (fontkitInstance) pdfDoc.registerFontkit(fontkitInstance);
    } catch {
    }

    // Charger Poppins-Bold pour Text1
    let fontPoppinsBold = fontBold;
    try {
      const poppinsBoldPath = path.join(process.cwd(), 'src/fonts/Poppins-Bold.ttf');
      if (fs.existsSync(poppinsBoldPath)) {
        const poppinsBoldBytes = fs.readFileSync(poppinsBoldPath);
        fontPoppinsBold = await pdfDoc.embedFont(poppinsBoldBytes);
      }
    } catch {
      // En cas d'erreur, on garde HelveticaBold
    }

    const text1Target = getFieldBoxAndPageIndex(pdfDoc, form, 'Text1');
    const text2Target = getFieldBoxAndPageIndex(pdfDoc, form, 'Text2');
    const text4Target = getFieldBoxAndPageIndex(pdfDoc, form, 'Text4');

    if (!text2Target || !text4Target) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Champs PDF Text2/Text4 introuvables ou non exploitables.' }));
      return;
    }

    // On vide les champs, on les "flatten" (pour éviter l’édition) et on dessine par-dessus.
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

    const blocks = [
      { title: 'Comment ces difficultés impactent votre vie quotidienne ?', body: impactQuotidien },
      { title: 'Impact sur le travail', body: impactTravail },
      { title: 'Explication complémentaire', body: explicationComplementaire },
      { title: 'Vos aspirations', body: aspirations },
    ];

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
        const measureFont = fontPoppinsBold || fontBold;
        while (size > 12 && measureFont.widthOfTextAtSize(text1, size) > maxWidth) {
          size -= 1;
        }

        const x = text1Target.box.x + padding;
        const y = text1Target.box.y + (text1Target.box.height - size) / 2;

        page1.drawText(text1, {
          x,
          y,
          size,
          font: fontPoppinsBold,
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

    const pdfBytes = await pdfDoc.save();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="mdph-projet-de-vie-rempli.pdf"');
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('PDF generation error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'PDF generation failed', details: String(err?.message || err) }));
  }
}
