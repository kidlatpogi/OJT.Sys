import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { AttendanceLog, UserProfile } from '@/types/ojt';
import {
  buildMonthlyRollups,
  computeAttendanceTotals,
  formatHoursWhole,
  formatReportDate,
  formatTimeDisplay,
  getMonthLabel,
  getWeekBounds,
} from '@/lib/ojt-calculations';
import { generateOfficialPdf, ReportType } from '@/lib/pdf-generator';
import { verifyApiRequest } from '@/lib/api-security';
import {
  sanitizeIsoDate,
  sanitizeLogsPayload,
  sanitizeProfilePayload,
  sanitizeYearMonth,
} from '@/lib/sanitize';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
type ExportFormat = 'docx' | 'pdf';

interface ExportPayload {
  type: ReportType;
  format?: ExportFormat;
  profile: UserProfile;
  logs: AttendanceLog[];
  monthFilter?: string;
  weekStart?: string;
}

const TEMPLATE_FILES: Record<ReportType, string[]> = {
  '003': [
    'SECA-CTNTERN-003-ATTENDANCE REPORT.docx',
    path.join('templates', 'SECA-003.docx'),
  ],
  '004': [
    'SECA-CTNTERN-004-Weekly Report Template.docx',
    path.join('templates', 'SECA-004.docx'),
  ],
  '005': [
    'SECA-CTNTERN-005-Monthly Report Template.docx',
    path.join('templates', 'SECA-005.docx'),
  ],
};

function resolveTemplatePath(type: ReportType): string | null {
  for (const rel of TEMPLATE_FILES[type]) {
    const full = path.join(process.cwd(), rel);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function setParagraphText(doc: Document, p: Element, text: string, stripCaps = false) {
  const pPr = p.getElementsByTagNameNS(W_NS, 'pPr').item(0);
  const firstRun = p.getElementsByTagNameNS(W_NS, 'r').item(0);
  const rawRPr = firstRun ? firstRun.getElementsByTagNameNS(W_NS, 'rPr').item(0) : null;
  const firstRPr = rawRPr ? (rawRPr.cloneNode(true) as Element) : null;

  if (stripCaps && firstRPr) {
    const capsNodes = firstRPr.getElementsByTagNameNS(W_NS, 'caps');
    for (let i = capsNodes.length - 1; i >= 0; i--) {
      const node = capsNodes.item(i);
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }
  }

  while (p.firstChild) {
    p.removeChild(p.firstChild);
  }
  if (pPr) p.appendChild(pPr);

  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    const r = doc.createElementNS(W_NS, 'w:r');
    if (firstRPr) r.appendChild(firstRPr.cloneNode(true));
    if (idx > 0) {
      r.appendChild(doc.createElementNS(W_NS, 'w:br'));
    }
    const t = doc.createElementNS(W_NS, 'w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = line;
    r.appendChild(t);
    p.appendChild(r);
  });
}

function setCellText(doc: Document, tc: Element, text: string) {
  const paragraphs = tc.getElementsByTagNameNS(W_NS, 'p');
  if (paragraphs.length === 0) return;
  const firstP = paragraphs.item(0)!;
  setParagraphText(doc, firstP, text);
  for (let i = paragraphs.length - 1; i >= 1; i--) {
    const extra = paragraphs.item(i);
    if (extra && extra.parentNode === tc) {
      tc.removeChild(extra);
    }
  }
}

function getParagraphPlainText(p: Element): string {
  const ts = p.getElementsByTagNameNS(W_NS, 't');
  let out = '';
  for (let i = 0; i < ts.length; i++) {
    out += ts.item(i)?.textContent || '';
  }
  return out;
}

function buildFilledDocxBuffer(body: ExportPayload): Buffer {
  const { type, profile, logs } = body;
  const templatePath = resolveTemplatePath(type);
  if (!templatePath) {
    throw new Error(`Template for ${type} not found`);
  }

  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  const xmlStr = zip.file('word/document.xml')?.asText();
  if (!xmlStr) {
    throw new Error('Malformed template document.xml');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');
  const tables = doc.getElementsByTagNameNS(W_NS, 'tbl');
  const allParagraphs = doc.getElementsByTagNameNS(W_NS, 'p');

  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const activeMonth =
    body.monthFilter ||
    (sortedLogs[sortedLogs.length - 1]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7));

  if (type === '003') {
    const tbl = tables.item(0);
    if (tbl) {
      const rows = tbl.getElementsByTagNameNS(W_NS, 'tr');
      const r0Cells = rows.item(0)?.getElementsByTagNameNS(W_NS, 'tc');
      if (r0Cells && r0Cells.length > 1) {
        setCellText(doc, r0Cells.item(1)!, profile.full_name || '');
      }
      const r1Cells = rows.item(1)?.getElementsByTagNameNS(W_NS, 'tc');
      if (r1Cells && r1Cells.length > 1) {
        setCellText(
          doc,
          r1Cells.item(1)!,
          `${profile.company_name}${profile.branch_department ? ` (${profile.branch_department})` : ''}`
        );
      }

      const periodLogs = sortedLogs.slice(-12);
      for (let i = 0; i < 12; i++) {
        const row = rows.item(4 + i);
        if (!row) continue;
        const cells = row.getElementsByTagNameNS(W_NS, 'tc');
        const log = periodLogs[i];
        if (cells.length >= 4) {
          if (log) {
            setCellText(doc, cells.item(0)!, formatReportDate(log.date));
            setCellText(doc, cells.item(1)!, formatTimeDisplay(log.time_in));
            setCellText(doc, cells.item(2)!, formatTimeDisplay(log.time_out));
            setCellText(doc, cells.item(3)!, log.hours_worked ? formatHoursWhole(log.hours_worked) : '');
          } else {
            setCellText(doc, cells.item(0)!, '');
            setCellText(doc, cells.item(1)!, '');
            setCellText(doc, cells.item(2)!, '');
            setCellText(doc, cells.item(3)!, '');
          }
        }
      }

      const totals = computeAttendanceTotals(
        sortedLogs,
        periodLogs.map((l) => l.date)
      );
      const r16Cells = rows.item(16)?.getElementsByTagNameNS(W_NS, 'tc');
      if (r16Cells && r16Cells.length >= 6) {
        setCellText(doc, r16Cells.item(1)!, formatHoursWhole(totals.previousTotal));
        setCellText(doc, r16Cells.item(3)!, formatHoursWhole(totals.totalThisPeriod));
        setCellText(doc, r16Cells.item(5)!, formatHoursWhole(totals.totalHoursServed));
      }
    }
  } else if (type === '004') {
    const refDate =
      body.weekStart || sortedLogs[sortedLogs.length - 1]?.date || new Date().toISOString().slice(0, 10);
    const bounds = getWeekBounds(refDate);
    const weekLogs = sortedLogs
      .filter((l) => l.date >= bounds.start && l.date <= bounds.end)
      .slice(0, 5);
    const totalWeeklyHours = weekLogs.reduce(
      (acc, l) => acc + Math.ceil(Number(l.hours_worked) || 0),
      0
    );

    for (let i = 0; i < allParagraphs.length; i++) {
      const p = allParagraphs.item(i)!;
      const txt = getParagraphPlainText(p);
      if (txt.includes('MONTH OF:')) {
        setParagraphText(doc, p, `MONTH OF: ${getMonthLabel(bounds.start)}`);
      } else if (txt.includes('TERM 2')) {
        setParagraphText(doc, p, profile.academic_term || 'TERM 2 AY 2025 - 2026');
      } else if (txt.includes('Name of Student Trainee:')) {
        setParagraphText(doc, p, `Name of Student Trainee: ${profile.full_name}`);
      } else if (txt.includes('Name of Company/Branch Office:')) {
        setParagraphText(
          doc,
          p,
          `Name of Company/Branch Office: ${profile.company_name}${profile.branch_department ? ` / ${profile.branch_department}` : ''}`
        );
      } else if (txt.includes('Total No. of HOURS:')) {
        setParagraphText(doc, p, `Total No. of HOURS: ${formatHoursWhole(totalWeeklyHours)}`);
      }
    }

    const tbl = tables.item(0);
    if (tbl) {
      const rows = tbl.getElementsByTagNameNS(W_NS, 'tr');
      for (let i = 0; i < 5; i++) {
        const row = rows.item(1 + i);
        if (!row) continue;
        const cells = row.getElementsByTagNameNS(W_NS, 'tc');
        const log = weekLogs[i];
        if (cells.length >= 3) {
          if (log) {
            setCellText(doc, cells.item(0)!, formatReportDate(log.date));
            setCellText(
              doc,
              cells.item(1)!,
              log.ai_summary || log.custom_tasks || log.tasks_selected.join(', ')
            );
            setCellText(doc, cells.item(2)!, formatHoursWhole(log.hours_worked));
          } else {
            setCellText(doc, cells.item(0)!, '');
            setCellText(doc, cells.item(1)!, '');
            setCellText(doc, cells.item(2)!, '');
          }
        }
      }
    }
  } else if (type === '005') {
    const rollups = buildMonthlyRollups(sortedLogs, activeMonth).slice(0, 4);
    const totalMonthlyHours = rollups.reduce((acc, w) => acc + Math.ceil(w.totalHours), 0);

    for (let i = 0; i < allParagraphs.length; i++) {
      const p = allParagraphs.item(i)!;
      const txt = getParagraphPlainText(p);
      if (txt.includes('MONTH OF:')) {
        setParagraphText(doc, p, `MONTH OF: ${getMonthLabel(`${activeMonth}-01`)}`);
      } else if (txt.includes('TERM 2')) {
        setParagraphText(doc, p, profile.academic_term || 'TERM 2 AY 2025 - 2026');
      } else if (txt.includes('Name of Student Trainee:')) {
        setParagraphText(doc, p, `Name of Student Trainee: ${profile.full_name}`);
      } else if (txt.includes('Name of Company/Branch Office:')) {
        setParagraphText(
          doc,
          p,
          `Name of Company/Branch Office: ${profile.company_name}${profile.branch_department ? ` / ${profile.branch_department}` : ''}`
        );
      } else if (txt.includes('Total No. of HOURS:')) {
        setParagraphText(
          doc,
          p,
          `                                      Total No. of HOURS: ${formatHoursWhole(totalMonthlyHours)}`,
          true
        );
      }
    }

    const tbl = tables.item(0);
    if (tbl) {
      const rows = tbl.getElementsByTagNameNS(W_NS, 'tr');
      for (let i = 0; i < 4; i++) {
        const row = rows.item(1 + i);
        if (!row) continue;
        const cells = row.getElementsByTagNameNS(W_NS, 'tc');
        const wk = rollups[i];
        if (cells.length >= 3) {
          if (wk) {
            setCellText(doc, cells.item(0)!, wk.dateRangeLabel);
            setCellText(doc, cells.item(1)!, wk.weeklyAccomplishments);
            setCellText(doc, cells.item(2)!, formatHoursWhole(wk.totalHours));
          } else {
            setCellText(doc, cells.item(0)!, '');
            setCellText(doc, cells.item(1)!, '');
            setCellText(doc, cells.item(2)!, '');
          }
        }
      }
    }
  }

  const updatedXml = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', updatedXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await verifyApiRequest(req, {
    bucket: 'report-export',
    maxRequests: 30,
    maxBodyBytes: 262144,
  });
  if (errorResponse) return errorResponse;

  try {
    const raw = (await req.json()) as Partial<ExportPayload>;
    const type = raw.type;
    const format: ExportFormat = raw.format === 'pdf' ? 'pdf' : 'docx';

    if (!type || !['003', '004', '005'].includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const profile = sanitizeProfilePayload(raw.profile);
    const logs = sanitizeLogsPayload(raw.logs);
    const monthFilter = sanitizeYearMonth(raw.monthFilter) || undefined;
    const weekStart = sanitizeIsoDate(raw.weekStart) || undefined;

    const baseNames: Record<ReportType, string> = {
      '003': 'SECA-CTNTERN-003-ATTENDANCE-REPORT',
      '004': 'SECA-CTNTERN-004-Weekly-Report',
      '005': 'SECA-CTNTERN-005-Monthly-Report',
    };

    if (format === 'pdf') {
      const pdfBytes = await generateOfficialPdf({
        type,
        profile,
        logs,
        monthFilter,
        weekStart,
      });

      return new NextResponse(new Uint8Array(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${baseNames[type]}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const docxBuffer = buildFilledDocxBuffer({
      type,
      format,
      profile,
      logs,
      monthFilter,
      weekStart,
    });

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${baseNames[type]}.docx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
