import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Export financial statement data to PDF
 * @param {Object} data - Financial statement data
 * @param {Object} options - Export options
 */
export function exportToPDF(data, options = {}) {
  const {
    filename = 'financial-statement.pdf',
    title = 'Financial Statement',
    dateRange = '',
    includeCharts = false,
  } = options;

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 20);

  // Add date range
  if (dateRange) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${dateRange}`, 20, 30);
  }

  // Add company info
  doc.setFontSize(10);
  doc.text('Countryside Steak House', 20, 40);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);

  let yPosition = 60;

  // Financial Summary Table
  const summaryData = [
    [
      'Revenue',
      `₱${Number(data.revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ],
    [
      'Cost of Goods Sold',
      `₱${Number(data.cogs || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ],
    [
      'Gross Profit',
      `₱${Number(data.grossProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ],
    [
      'Operating Expenses',
      `₱${Number(data.operatingExpenses || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ],
    [
      'Net Income',
      `₱${Number(data.netIncome || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ],
    [
      'Cash on Hand',
      `₱${Number(data.cashOnHand || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ],
  ];

  doc.autoTable({
    head: [['Financial Metric', 'Amount']],
    body: summaryData,
    startY: yPosition,
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [70, 97, 20], // Primary green color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
  });

  yPosition = doc.lastAutoTable.finalY + 20;

  // Financial Ratios Section
  if (data.revenue && data.revenue > 0) {
    const grossMargin = ((data.grossProfit / data.revenue) * 100).toFixed(2);
    const netMargin = ((data.netIncome / data.revenue) * 100).toFixed(2);

    const ratiosData = [
      ['Gross Profit Margin', `${grossMargin}%`],
      ['Net Profit Margin', `${netMargin}%`],
      [
        'Operating Expense Ratio',
        `${((data.operatingExpenses / data.revenue) * 100).toFixed(2)}%`,
      ],
    ];

    doc.autoTable({
      head: [['Financial Ratio', 'Value']],
      body: ratiosData,
      startY: yPosition,
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [70, 97, 20],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
    });
  }

  // Add breakdown sections if available
  if (data.breakdowns) {
    yPosition = doc.lastAutoTable.finalY + 20;

    // Revenue Breakdown
    if (data.breakdowns.revenue && data.breakdowns.revenue.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Breakdown', 20, yPosition);
      yPosition += 15;

      doc.autoTable({
        head: [['Branch/Category', 'Amount', 'Percentage']],
        body: data.breakdowns.revenue.map((item) => [
          item.name,
          `₱${Number(item.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          `${item.percentage}%`,
        ]),
        startY: yPosition,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [70, 97, 20],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Expense Breakdown
    if (data.breakdowns.expenses && data.breakdowns.expenses.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Breakdown', 20, yPosition);
      yPosition += 15;

      doc.autoTable({
        head: [['Category', 'Amount', 'Percentage']],
        body: data.breakdowns.expenses.map((item) => [
          item.name,
          `₱${Number(item.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          `${item.percentage}%`,
        ]),
        startY: yPosition,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: {
          fillColor: [70, 97, 20],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
      });
    }
  }

  // Save the PDF
  doc.save(filename);
}

/**
 * Export financial statement data to Excel
 * @param {Object} data - Financial statement data
 * @param {Object} options - Export options
 */
export function exportToExcel(data, options = {}) {
  const {
    filename = 'financial-statement.xlsx',
    title = 'Financial Statement',
    dateRange = '',
  } = options;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Financial Statement', ''],
    ['Period', dateRange],
    ['Generated On', new Date().toLocaleDateString()],
    [''],
    ['Financial Metrics', 'Amount (₱)'],
    ['Revenue', Number(data.revenue || 0)],
    ['Cost of Goods Sold', Number(data.cogs || 0)],
    ['Gross Profit', Number(data.grossProfit || 0)],
    ['Operating Expenses', Number(data.operatingExpenses || 0)],
    ['Net Income', Number(data.netIncome || 0)],
    ['Cash on Hand', Number(data.cashOnHand || 0)],
  ];

  // Add financial ratios if revenue > 0
  if (data.revenue && data.revenue > 0) {
    summaryData.push(['']);
    summaryData.push(['Financial Ratios', 'Value']);
    summaryData.push([
      'Gross Profit Margin',
      `${((data.grossProfit / data.revenue) * 100).toFixed(2)}%`,
    ]);
    summaryData.push([
      'Net Profit Margin',
      `${((data.netIncome / data.revenue) * 100).toFixed(2)}%`,
    ]);
    summaryData.push([
      'Operating Expense Ratio',
      `${((data.operatingExpenses / data.revenue) * 100).toFixed(2)}%`,
    ]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  summarySheet['!cols'] = [{ width: 25 }, { width: 20 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Revenue Breakdown Sheet
  if (
    data.breakdowns &&
    data.breakdowns.revenue &&
    data.breakdowns.revenue.length > 0
  ) {
    const revenueData = [['Branch/Category', 'Amount (₱)', 'Percentage (%)']];

    data.breakdowns.revenue.forEach((item) => {
      revenueData.push([
        item.name,
        Number(item.amount),
        Number(item.percentage),
      ]);
    });

    const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);
    revenueSheet['!cols'] = [{ width: 25 }, { width: 15 }, { width: 15 }];

    XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Breakdown');
  }

  // Expense Breakdown Sheet
  if (
    data.breakdowns &&
    data.breakdowns.expenses &&
    data.breakdowns.expenses.length > 0
  ) {
    const expenseData = [['Category', 'Amount (₱)', 'Percentage (%)']];

    data.breakdowns.expenses.forEach((item) => {
      expenseData.push([
        item.name,
        Number(item.amount),
        Number(item.percentage),
      ]);
    });

    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
    expenseSheet['!cols'] = [{ width: 25 }, { width: 15 }, { width: 15 }];

    XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expense Breakdown');
  }

  // COGS Breakdown Sheet
  if (
    data.breakdowns &&
    data.breakdowns.cogs &&
    data.breakdowns.cogs.length > 0
  ) {
    const cogsData = [['Menu Category', 'Amount (₱)', 'Percentage (%)']];

    data.breakdowns.cogs.forEach((item) => {
      cogsData.push([item.name, Number(item.amount), Number(item.percentage)]);
    });

    const cogsSheet = XLSX.utils.aoa_to_sheet(cogsData);
    cogsSheet['!cols'] = [{ width: 25 }, { width: 15 }, { width: 15 }];

    XLSX.utils.book_append_sheet(workbook, cogsSheet, 'COGS Breakdown');
  }

  // Branch Performance Sheet
  if (
    data.breakdowns &&
    data.breakdowns.branches &&
    data.breakdowns.branches.length > 0
  ) {
    const branchData = [
      [
        'Branch',
        'Revenue (₱)',
        'COGS (₱)',
        'Gross Profit (₱)',
        'Expenses (₱)',
        'Net Income (₱)',
      ],
    ];

    data.breakdowns.branches.forEach((item) => {
      branchData.push([
        item.name,
        Number(item.revenue || 0),
        Number(item.cogs || 0),
        Number(item.grossProfit || 0),
        Number(item.expenses || 0),
        Number(item.netIncome || 0),
      ]);
    });

    const branchSheet = XLSX.utils.aoa_to_sheet(branchData);
    branchSheet['!cols'] = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, branchSheet, 'Branch Performance');
  }

  // Save the Excel file
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx', type: 'file' });
}

/**
 * Format financial data for export
 * @param {Object} statement - Financial statement object
 * @param {Object} breakdowns - Breakdown data
 * @param {String} period - Selected period
 * @param {String} dateRange - Date range string
 */
export function formatFinancialData(
  statement,
  breakdowns = {},
  period,
  dateRange
) {
  return {
    ...statement,
    breakdowns,
    period,
    dateRange,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate filename based on period and date
 * @param {String} period - Selected period
 * @param {String} dateRange - Date range
 * @param {String} format - File format (pdf or xlsx)
 */
export function generateFilename(period, dateRange, format) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const periodStr = period
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');

  let filename = `financial-statement-${periodStr}-${dateStr}`;

  if (dateRange) {
    // Clean date range for filename
    const cleanDateRange = dateRange.replace(/[^a-zA-Z0-9-]/g, '-');
    filename += `-${cleanDateRange}`;
  }

  return `${filename}.${format}`;
}
