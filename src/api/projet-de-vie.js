import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { generateProjetDeViePdf } from './lib/projet-de-vie-pdf.js';

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
    const pdvRoot = process.cwd();
    const pdvPdfPath = path.join(pdvRoot, 'public', 'pdf', 'mdph-projet-de-vie.pdf');
    const pdvBody = req.body && typeof req.body === 'object' ? req.body : {};

    if (!fs.existsSync(pdvPdfPath)) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'PDF introuvable sur le serveur.' }));
      return;
    }

    const pdvPrenom = pickFirstString(pdvBody, ['prenom', 'prenom:']);
    const pdvNom = pickFirstString(pdvBody, ['nom', 'nom:']);

    const pdvImpactQuotidien = pickString(pdvBody, 'impact_quotidien');
    const pdvImpactTravail = pickString(pdvBody, 'description_impact_travail');
    const pdvExplicationComplementaire = pickString(pdvBody, 'explication_demande');
    const pdvAspirations = pickString(pdvBody, 'projet_vie');

    const pdvBlocks = [
      { title: 'Comment ces difficultés impactent votre vie quotidienne ?', body: pdvImpactQuotidien },
      { title: 'Impact sur le travail', body: pdvImpactTravail },
      { title: 'Explication complémentaire', body: pdvExplicationComplementaire },
      { title: 'Vos aspirations', body: pdvAspirations },
    ];

    try {
      const pdvPdfBytes = await generateProjetDeViePdf({
        pdfPath: pdvPdfPath,
        prenom: pdvPrenom,
        nom: pdvNom,
        blocks: pdvBlocks,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="mdph-projet-de-vie-rempli.pdf"');
      res.end(Buffer.from(pdvPdfBytes));
      return;
    } catch (e) {
      if (String(e?.message || e).includes('Champs PDF Text2/Text4')) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Champs PDF Text2/Text4 introuvables ou non exploitables.' }));
        return;
      }
      throw e;
    }
  } catch (err) {
    console.error('PDF generation error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'PDF generation failed', details: String(err?.message || err) }));
  }
}

