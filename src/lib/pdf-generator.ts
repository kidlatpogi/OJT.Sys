import fs from 'fs';
import path from 'path';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
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

export type ReportType = '003' | '004' | '005';

// Exact template logo dimensions from Word XML: 3743325 x 923017 EMUs = 294.75pt x 72.68pt
const LOGO_WIDTH_PT = 294.75;
const LOGO_HEIGHT_PT = 72.68;

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const paragraphs = (text || '').split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawCellBox(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  fill?: [number, number, number]
) {
  if (fill) {
    page.drawRectangle({
      x,
      y: topY - h,
      width: w,
      height: h,
      color: rgb(fill[0], fill[1], fill[2]),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.75,
    });
  } else {
    page.drawRectangle({
      x,
      y: topY - h,
      width: w,
      height: h,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.75,
    });
  }
}

function drawCellTextLines(
  page: PDFPage,
  lines: string[],
  x: number,
  topY: number,
  w: number,
  h: number,
  font: PDFFont,
  size: number,
  align: 'left' | 'center' | 'right' = 'left',
  color: [number, number, number] = [0, 0, 0],
  padX = 6,
  padTop = 12
) {
  const lineHeight = size + 3;
  lines.forEach((line, idx) => {
    const textW = font.widthOfTextAtSize(line, size);
    let drawX = x + padX;
    if (align === 'center') drawX = x + (w - textW) / 2;
    else if (align === 'right') drawX = x + w - padX - textW;

    const drawY = topY - padTop - idx * lineHeight;
    if (drawY >= topY - h + 3) {
      page.drawText(line, {
        x: drawX,
        y: drawY,
        size,
        font,
        color: rgb(color[0], color[1], color[2]),
      });
    }
  });
}

async function drawCenteredHeaderBanner(
  pdfDoc: PDFDocument,
  page: PDFPage,
  pageWidth: number,
  topY: number
): Promise<number> {
  const logoPath = path.join(process.cwd(), 'public', 'seca-header.png');
  if (!fs.existsSync(logoPath)) return topY;

  const logoBytes = fs.readFileSync(logoPath);
  const img = await pdfDoc.embedPng(logoBytes);
  const centeredX = (pageWidth - LOGO_WIDTH_PT) / 2;
  page.drawImage(img, {
    x: centeredX,
    y: topY - LOGO_HEIGHT_PT,
    width: LOGO_WIDTH_PT,
    height: LOGO_HEIGHT_PT,
  });
  return topY - LOGO_HEIGHT_PT - 14;
}

function drawCenteredUnderlinedHeading(
  page: PDFPage,
  prefix: string,
  underlinedWord: string,
  suffix: string,
  pageWidth: number,
  y: number,
  font: PDFFont,
  size: number
) {
  const fullText = `${prefix}${underlinedWord}${suffix}`;
  const fullW = font.widthOfTextAtSize(fullText, size);
  const startX = (pageWidth - fullW) / 2;

  page.drawText(fullText, { x: startX, y, size, font });

  const prefixW = font.widthOfTextAtSize(prefix, size);
  const wordW = font.widthOfTextAtSize(underlinedWord, size);
  page.drawLine({
    start: { x: startX + prefixW, y: y - 1.5 },
    end: { x: startX + prefixW + wordW, y: y - 1.5 },
    thickness: 0.9,
    color: rgb(0, 0, 0),
  });
}

export async function generateOfficialPdf(params: {
  type: ReportType;
  profile: UserProfile;
  logs: AttendanceLog[];
  monthFilter?: string;
  weekStart?: string;
}): Promise<Buffer> {
  const { type, profile, logs } = params;
  const pdfDoc = await PDFDocument.create();

  // Exact page dimensions matching each Word template (003 & 004: A4, 005: US Letter)
  const pageWidth = type === '005' ? 612 : 595.5;
  const pageHeight = type === '005' ? 792 : 842;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const marginX = type === '003' ? 45 : 50.4;
  const contentW = type === '003' ? 500 : type === '004' ? 503.65 : 506.85;
  const startTopY = pageHeight - 24;

  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  let y = await drawCenteredHeaderBanner(pdfDoc, page, pageWidth, startTopY);

  if (type === '003') {
    const title = 'DAILY ATTENDANCE REPORT';
    const titleW = fontBold.widthOfTextAtSize(title, 13);
    page.drawText(title, {
      x: (pageWidth - titleW) / 2,
      y,
      size: 13,
      font: fontBold,
    });
    y -= 18;

    // Name & Company rows
    drawCellBox(page, marginX, y, 90, 22);
    drawCellTextLines(page, ['Name:'], marginX, y, 90, 22, fontBold, 9.5, 'left', [0, 0, 0], 6, 14);
    drawCellBox(page, marginX + 90, y, contentW - 90, 22);
    drawCellTextLines(page, [profile.full_name || ''], marginX + 90, y, contentW - 90, 22, fontRegular, 9.5, 'left', [0, 0, 0], 6, 14);
    y -= 22;

    const companyVal = `${profile.company_name}${profile.branch_department ? ` (${profile.branch_department})` : ''}`;
    drawCellBox(page, marginX, y, 90, 22);
    drawCellTextLines(page, ['Company:'], marginX, y, 90, 22, fontBold, 9.5, 'left', [0, 0, 0], 6, 14);
    drawCellBox(page, marginX + 90, y, contentW - 90, 22);
    drawCellTextLines(page, [companyVal], marginX + 90, y, contentW - 90, 22, fontRegular, 9.5, 'left', [0, 0, 0], 6, 14);
    y -= 22;

    // NOTE row
    const noteText =
      'NOTE: To be filled up by the intern and signed by the Internship Supervisor/immediate supervisor on a daily basis. This must be submitted to the Internship Coordinator along with the weekly activity report.';
    const noteLines = wrapText(noteText, fontRegular, 8, contentW - 12);
    const noteH = Math.max(28, noteLines.length * 11 + 8);
    drawCellBox(page, marginX, y, contentW, noteH);
    drawCellTextLines(page, noteLines, marginX, y, contentW, noteH, fontRegular, 8, 'left', [0, 0, 0], 6, 12);
    y -= noteH;

    // Table header (sums to 500pt)
    const cols = [126, 82, 82, 78, 132];
    const headers = ['Date', 'Time-In', 'Time-Out', 'Total Hours', 'Signature'];
    let cx = marginX;
    headers.forEach((hText, idx) => {
      drawCellBox(page, cx, y, cols[idx], 22, [0.95, 0.96, 0.98]);
      drawCellTextLines(page, [hText], cx, y, cols[idx], 22, fontBold, 9, 'center', [0, 0, 0], 4, 14);
      cx += cols[idx];
    });
    y -= 22;

    // 12 Attendance Rows
    const periodLogs = sortedLogs.slice(-12);
    for (let i = 0; i < 12; i++) {
      const log = periodLogs[i];
      const rowH = 22;
      const vals = log
        ? [
            formatReportDate(log.date),
            formatTimeDisplay(log.time_in),
            formatTimeDisplay(log.time_out),
            log.hours_worked ? formatHoursWhole(log.hours_worked) : '',
            '',
          ]
        : ['', '', '', '', ''];

      cx = marginX;
      vals.forEach((val, idx) => {
        drawCellBox(page, cx, y, cols[idx], rowH);
        drawCellTextLines(
          page,
          [val],
          cx,
          y,
          cols[idx],
          rowH,
          idx === 3 ? fontBold : fontRegular,
          8.5,
          idx === 0 ? 'left' : 'center',
          [0, 0, 0],
          5,
          14
        );
        cx += cols[idx];
      });
      y -= rowH;
    }

    // Totals Row (sums to 500pt)
    const totals = computeAttendanceTotals(
      sortedLogs,
      periodLogs.map((l) => l.date)
    );
    const totCols = [68, 56, 78, 56, 168, 74];
    const totH = 30;
    const totCells = [
      { lines: ['Previous', 'Total:'], font: fontBold, align: 'left' as const },
      { lines: [formatHoursWhole(totals.previousTotal)], font: fontBold, align: 'center' as const },
      { lines: ['Total this', 'Period:'], font: fontBold, align: 'left' as const },
      { lines: [formatHoursWhole(totals.totalThisPeriod)], font: fontBold, align: 'center' as const },
      { lines: ['Total Hours Served:', '(Previous Total + Total this Period)'], font: fontBold, align: 'left' as const },
      { lines: [formatHoursWhole(totals.totalHoursServed)], font: fontBold, align: 'center' as const },
    ];
    cx = marginX;
    totCells.forEach((cell, idx) => {
      drawCellBox(page, cx, y, totCols[idx], totH);
      drawCellTextLines(page, cell.lines, cx, y, totCols[idx], totH, cell.font, 8, cell.align, [0, 0, 0], 4, 11);
      cx += totCols[idx];
    });
    y -= totH;

    // Intern Signature Row (126 + 242 + 132 = 500)
    drawCellBox(page, marginX, y, 126, 26);
    drawCellTextLines(page, ['Intern Signature'], marginX, y, 126, 26, fontBold, 8.5, 'left', [0, 0, 0], 6, 16);
    drawCellBox(page, marginX + 126, y, 242, 26);
    drawCellBox(page, marginX + 368, y, 132, 26);
    drawCellTextLines(page, ['Date'], marginX + 368, y, 132, 26, fontBold, 8.5, 'left', [0, 0, 0], 6, 16);
    y -= 26;

    // Verification Statement Row
    const verifyText =
      'I verify that the above information is correct and that the intern was in attendance on the above days at the times indicated.';
    drawCellBox(page, marginX, y, contentW, 22);
    drawCellTextLines(page, [verifyText], marginX, y, contentW, 22, fontRegular, 7.6, 'left', [0, 0, 0], 6, 14);
    y -= 22;

    // Supervisor Signature Row
    drawCellBox(page, marginX, y, 126, 26);
    drawCellTextLines(page, ['Supervisor Signature'], marginX, y, 126, 26, fontBold, 8.5, 'left', [0, 0, 0], 6, 16);
    drawCellBox(page, marginX + 126, y, 242, 26);
    drawCellBox(page, marginX + 368, y, 132, 26);
    drawCellTextLines(page, ['Date'], marginX + 368, y, 132, 26, fontBold, 8.5, 'left', [0, 0, 0], 6, 16);

    page.drawText('SECA-CTNTERN-003', { x: marginX, y: 24, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('Page 1 of 1', { x: marginX + contentW - 46, y: 24, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  } else {
    const isWeekly = type === '004';
    const refDate =
      params.weekStart || sortedLogs[sortedLogs.length - 1]?.date || new Date().toISOString().slice(0, 10);
    const bounds = getWeekBounds(refDate);
    const activeMonth =
      params.monthFilter ||
      (sortedLogs[sortedLogs.length - 1]?.date.slice(0, 7) ?? new Date().toISOString().slice(0, 7));

    drawCenteredUnderlinedHeading(
      page,
      'ON-THE-JOB TRAINING ',
      isWeekly ? 'WEEKLY' : 'MONTHLY',
      ' ACCOMPLISHMENT REPORT',
      pageWidth,
      y,
      fontBold,
      11.5
    );
    y -= 16;

    const monthLine = `MONTH OF: ${isWeekly ? getMonthLabel(bounds.start) : getMonthLabel(`${activeMonth}-01`)}`;
    const termLine = profile.academic_term || 'TERM 2 AY 2025 - 2026';

    [
      { text: monthLine, font: fontBold, size: 10.5 },
      { text: termLine, font: fontBold, size: 10 },
    ].forEach((hdr) => {
      const tw = hdr.font.widthOfTextAtSize(hdr.text, hdr.size);
      page.drawText(hdr.text, { x: (pageWidth - tw) / 2, y, size: hdr.size, font: hdr.font });
      y -= 15;
    });

    y -= 8;
    page.drawText(`Name of Student Trainee: ${profile.full_name}`, {
      x: marginX,
      y,
      size: 9.5,
      font: fontRegular,
    });
    y -= 14;
    page.drawText(
      `Name of Company/Branch Office: ${profile.company_name}${profile.branch_department ? ` / ${profile.branch_department}` : ''}`,
      { x: marginX, y, size: 9.5, font: fontRegular }
    );
    y -= 18;

    const cols = isWeekly ? [112, 306.65, 85] : [124, 297.85, 85];
    const headers = isWeekly
      ? ['DATE', 'DAILY ACCOMPLISHMENTS', 'NO. OF WORKING HOURS']
      : ['DATE', 'WEEKLY ACCOMPLISHMENTS', 'NO. OF WORKING HOURS'];

    let cx = marginX;
    headers.forEach((hText, idx) => {
      drawCellBox(page, cx, y, cols[idx], 26, [0.95, 0.96, 0.98]);
      const hLines = wrapText(hText, fontBold, 8.2, cols[idx] - 8);
      drawCellTextLines(page, hLines, cx, y, cols[idx], 26, fontBold, 8.2, 'center', [0, 0, 0], 4, 11);
      cx += cols[idx];
    });
    y -= 26;

    const rowsData: { dateCol: string; textCol: string; hoursCol: string }[] = isWeekly
      ? Array.from({ length: 5 }).map((_, i) => {
          const log = sortedLogs
            .filter((l) => l.date >= bounds.start && l.date <= bounds.end)
            .slice(0, 5)[i];
          return log
            ? {
                dateCol: formatReportDate(log.date),
                textCol: log.ai_summary || log.custom_tasks || log.tasks_selected.join(', '),
                hoursCol: formatHoursWhole(log.hours_worked),
              }
            : { dateCol: '', textCol: '', hoursCol: '' };
        })
      : Array.from({ length: 4 }).map((_, i) => {
          const wk = buildMonthlyRollups(sortedLogs, activeMonth).slice(0, 4)[i];
          return wk
            ? {
                dateCol: wk.dateRangeLabel,
                textCol: wk.weeklyAccomplishments,
                hoursCol: formatHoursWhole(wk.totalHours),
              }
            : { dateCol: '', textCol: '', hoursCol: '' };
        });

    let totalHoursSum = 0;
    if (isWeekly) {
      totalHoursSum = sortedLogs
        .filter((l) => l.date >= bounds.start && l.date <= bounds.end)
        .slice(0, 5)
        .reduce((acc, l) => acc + Math.ceil(Number(l.hours_worked) || 0), 0);
    } else {
      totalHoursSum = buildMonthlyRollups(sortedLogs, activeMonth)
        .slice(0, 4)
        .reduce((acc, w) => acc + Math.ceil(w.totalHours), 0);
    }

    for (const row of rowsData) {
      const dateLines = wrapText(row.dateCol, fontRegular, 8.5, cols[0] - 10);
      const bodyLines = wrapText(row.textCol, fontRegular, 8.5, cols[1] - 12);
      const maxLines = Math.max(dateLines.length, bodyLines.length, 1);
      const rowH = Math.max(isWeekly ? 46 : 56, maxLines * 11.5 + 14);

      drawCellBox(page, marginX, y, cols[0], rowH);
      drawCellTextLines(page, dateLines, marginX, y, cols[0], rowH, fontRegular, 8.5, 'left', [0, 0, 0], 5, 13);

      drawCellBox(page, marginX + cols[0], y, cols[1], rowH);
      drawCellTextLines(page, bodyLines, marginX + cols[0], y, cols[1], rowH, fontRegular, 8.5, 'left', [0, 0, 0], 6, 13);

      drawCellBox(page, marginX + cols[0] + cols[1], y, cols[2], rowH);
      drawCellTextLines(page, [row.hoursCol], marginX + cols[0] + cols[1], y, cols[2], rowH, fontBold, 9, 'center', [0, 0, 0], 4, 14);

      y -= rowH;
    }

    y -= 16;
    const totalLabel = `Total No. of HOURS: ${formatHoursWhole(totalHoursSum)}`;
    const totalW = fontBold.widthOfTextAtSize(totalLabel, 10);
    page.drawText(totalLabel, { x: marginX + contentW - totalW, y, size: 10, font: fontBold });

    y -= 30;
    page.drawText('Checked by:', { x: marginX, y, size: 9, font: fontRegular });
    page.drawText('Noted by:', { x: marginX + 275, y, size: 9, font: fontRegular });

    y -= 34;
    if (profile.trainor_name) {
      page.drawText(profile.trainor_name, { x: marginX, y: y + 4, size: 9, font: fontBold });
    }
    if (profile.supervisor_name) {
      page.drawText(profile.supervisor_name, { x: marginX + 275, y: y + 4, size: 9, font: fontBold });
    }
    page.drawLine({ start: { x: marginX, y }, end: { x: marginX + 210, y }, thickness: 0.75 });
    page.drawLine({ start: { x: marginX + 275, y }, end: { x: marginX + contentW, y }, thickness: 0.75 });

    y -= 12;
    page.drawText('Signature over Printed Name of Trainor', { x: marginX, y, size: 8, font: fontRegular });
    page.drawText('Signature over Printed Name of Supervisor/Manager', { x: marginX + 275, y, size: 8, font: fontRegular });

    page.drawText(isWeekly ? 'SECA-CTNTERN-004' : 'SECA-CTNTERN-005', {
      x: marginX,
      y: 24,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
