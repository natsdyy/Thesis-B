<script setup>
  import { ref, watch, computed, onMounted } from 'vue';
  import {
    X,
    Search,
    Filter,
    Calendar,
    Download,
    HelpCircle,
    ShoppingCart,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    RefreshCcw,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    Receipt,
    Printer,
  } from 'lucide-vue-next';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import QRCodeGenerator from '../common/QRCodeGenerator.vue';

  const props = defineProps({
    show: { type: Boolean, default: false },
    initialFilter: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(['close', 'reopen']);

  const posStore = usePOSStore();
  const context = useBranchContextStore();

  const loading = ref(false);
  const transactions = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalPages = ref(1);
  const totalTransactions = ref(0);
  const isExporting = ref(false);

  // Custom month picker state
  const showCustomMonthPicker = ref(false);
  const customMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Receipt modal state
  const showReceiptModal = ref(false);
  const selectedReceiptOrder = ref(null);
  const receiptQRData = ref('');
  const shouldReopenModal = ref(false);

  const filters = ref({
    search: '',
    status: '', // pending | processing | completed | void
    date_range: 'this_week',
    custom_month: '', // YYYY-MM format for custom month selection
  });

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'void', label: 'Void/Refunded' },
  ];

  const getStatusInfo = (status, voidReason) => {
    if (status === 'void') {
      const refundReasons = [
        'customer_cancelled',
        'wrong_order',
        'duplicate_order',
        'payment_issue',
        'system_error',
        'Customer Cancelled',
        'Wrong Order',
        'Duplicate Order',
        'Payment Issue',
        'System Error',
      ];

      const isRefund = refundReasons.includes(voidReason);

      return {
        icon: isRefund ? RefreshCcw : AlertCircle,
        label: isRefund ? 'Refunded' : 'Loss',
        badge: isRefund
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200',
        color: isRefund ? 'text-green-600' : 'text-red-600',
      };
    }

    const statusMap = {
      pending: {
        icon: Clock,
        label: 'Pending',
        badge: 'bg-info/20 text-info',
        color: 'text-info',
      },
      processing: {
        icon: RefreshCcw,
        label: 'Processing',
        badge: 'bg-warning/20 text-warning',
        color: 'text-warning',
      },
      completed: {
        icon: CheckCircle,
        label: 'Completed',
        badge: 'bg-success/20 text-success',
        color: 'text-success',
      },
    };

    return (
      statusMap[status] || {
        icon: HelpCircle,
        label: status,
        badge: 'bg-gray-100 text-gray-600',
        color: 'text-gray-600',
      }
    );
  };

  const formatTransactionDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPageRange = () => {
    const current = currentPage.value;
    const total = totalPages.value;
    const range = [];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) range.push(i);
    }
    return range;
  };

  const showLeftEllipsis = () => currentPage.value > 3;
  const showRightEllipsis = () => currentPage.value < totalPages.value - 2;

  const closeModal = () => {
    const dlg = document.getElementById('branch_sales_transaction_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  const fetchTransactions = async () => {
    if (!context.currentBranch?.id) return;
    loading.value = true;
    try {
      // Apply date range to get date_from and date_to
      applyDateRange();

      // Calculate offset for pagination
      const offset = (currentPage.value - 1) * itemsPerPage.value;

      const response = await posStore.fetchOrderHistory({
        branch_id: context.currentBranch.id,
        limit: itemsPerPage.value,
        offset: offset,
        status: filters.value.status,
        date_from: filters.value.date_from,
        date_to: filters.value.date_to,
      });

      if (response && response.data && Array.isArray(response.data)) {
        transactions.value = response.data.map((order) => {
          const isRefunded =
            order.status === 'void' &&
            [
              'customer_cancelled',
              'wrong_order',
              'duplicate_order',
              'payment_issue',
              'system_error',
              'Customer Cancelled',
              'Wrong Order',
              'Duplicate Order',
              'Payment Issue',
              'System Error',
            ].includes(order.void_reason);

          const isLoss =
            order.status === 'void' &&
            [
              'staff_error',
              'item_damaged',
              'expired_item',
              'quality_issue',
              'preparation_error',
              'Staff Error',
              'Item Damaged',
              'Expired Item',
              'Quality Issue',
              'Preparation Error',
            ].includes(order.void_reason);

          return {
            id: order.id,
            order_number: order.order_number,
            time: formatTime(order.created_at),
            date: formatTransactionDate(order.created_at),
            amount: parseFloat(order.total_amount) || 0,
            is_vat_exempt: Boolean(order.is_vat_exempt),
            discount_type: order.discount_type || 'NONE',
            amount_paid: parseFloat(order.amount_paid) || 0,
            change_amount: parseFloat(order.change_amount) || 0,
            items: order.items || [],
            itemsDisplay: order.items
              ? order.items
                  .map((item) => `${item.menu_item_name || item.item_name}`)
                  .join(', ')
              : 'No items',
            itemsCount: order.items?.length || 0,
            cashier:
              order.cashier_first_name && order.cashier_last_name
                ? `${order.cashier_first_name} ${order.cashier_last_name}`
                : 'Unknown',
            status: order.status,
            order_type: order.order_type,
            created_at: order.created_at,
            isRefunded: isRefunded,
            isLoss: isLoss,
            void_reason: order.void_reason,
            voided_at: order.voided_at,
            processed_at: order.processed_at,
            completed_at: order.completed_at,
          };
        });

        // Use actual pagination data from API
        if (response.pagination) {
          totalTransactions.value = response.pagination.total;
          totalPages.value = Math.max(
            1,
            Math.ceil(response.pagination.total / itemsPerPage.value)
          );
        } else {
          // Fallback if pagination data is not available
          totalTransactions.value = response.data.length;
          totalPages.value = Math.max(
            1,
            Math.ceil(response.data.length / itemsPerPage.value)
          );
        }
      } else {
        transactions.value = [];
        totalTransactions.value = 0;
        totalPages.value = 1;
      }
    } catch (e) {
      console.error('Failed to load sales transactions', e);
      transactions.value = [];
      totalTransactions.value = 0;
      totalPages.value = 1;
    } finally {
      loading.value = false;
    }
  };

  const clearFilters = () => {
    filters.value = {
      search: '',
      status: '',
      date_range: 'this_week',
      custom_month: '',
    };
    showCustomMonthPicker.value = false;
    currentPage.value = 1;
    fetchTransactions();
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
      fetchTransactions();
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
      fetchTransactions();
    }
  };

  watch(
    () => props.show,
    (val) => {
      const dlg = document.getElementById('branch_sales_transaction_modal');
      if (val) {
        Object.assign(filters.value, props.initialFilter || {});
        currentPage.value = 1;
        fetchTransactions();
        if (dlg?.showModal) dlg.showModal();
      } else if (dlg?.close) {
        dlg.close();
      }
    }
  );

  onMounted(() => {
    if (props.show) fetchTransactions();
  });

  // Date range helpers
  const toYmd = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const applyDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.value.date_range === 'today') {
      // For today, use full day range (00:00:00 to 23:59:59)
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      filters.value.date_from = startOfDay.toISOString();
      filters.value.date_to = endOfDay.toISOString();
    } else if (filters.value.date_range === 'this_week') {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(today);
      weekEnd.setHours(23, 59, 59, 999);

      filters.value.date_from = weekStart.toISOString();
      filters.value.date_to = weekEnd.toISOString();
    } else if (filters.value.date_range === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      filters.value.date_from = start.toISOString();
      filters.value.date_to = end.toISOString();
    } else if (filters.value.date_range === 'custom_month') {
      // For custom month, use the selected month or current month as fallback
      let year, month;
      if (filters.value.custom_month) {
        [year, month] = filters.value.custom_month.split('-').map(Number);
        month -= 1; // JavaScript months are 0-indexed
      } else {
        year = today.getFullYear();
        month = today.getMonth();
      }
      const start = new Date(year, month, 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);

      filters.value.date_from = start.toISOString();
      filters.value.date_to = end.toISOString();
    }
  };

  // Custom month picker methods
  const toggleCustomMonthPicker = () => {
    showCustomMonthPicker.value = !showCustomMonthPicker.value;
    if (showCustomMonthPicker.value) {
      filters.value.date_range = 'custom_month';
    }
  };

  const applyCustomMonthFilter = () => {
    const month = String(customMonthPicker.value.month).padStart(2, '0');
    const year = customMonthPicker.value.year;
    filters.value.custom_month = `${year}-${month}`;
    filters.value.date_range = 'custom_month';
    showCustomMonthPicker.value = false;
    currentPage.value = 1;
    fetchTransactions();
  };

  // Get display text for current filter
  const getFilterDisplayText = () => {
    switch (filters.value.date_range) {
      case 'today':
        return 'Today';
      case 'this_week':
        return 'This Week';
      case 'this_month':
        return 'This Month';
      case 'custom_month':
        if (filters.value.custom_month) {
          const [year, month] = filters.value.custom_month.split('-');
          const monthName = new Date(year, month - 1).toLocaleDateString(
            'en-US',
            {
              month: 'long',
              year: 'numeric',
            }
          );
          return monthName;
        }
        return 'Custom Month';
      default:
        return 'Today';
    }
  };

  // Month options for custom picker
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Export function - exports all transactions based on current filter, not just current page
  const exportTransactions = async () => {
    if (isExporting.value) return;

    isExporting.value = true;
    try {
      if (!context.currentBranch?.id) {
        throw new Error('No branch selected');
      }

      // Apply date range to get proper date filters
      applyDateRange();

      // Fetch ALL transactions for the current filter (not paginated)
      const response = await posStore.fetchOrderHistory({
        branch_id: context.currentBranch.id,
        limit: 10000, // Large limit to get all transactions
        offset: 0,
        status: filters.value.status,
        date_from: filters.value.date_from,
        date_to: filters.value.date_to,
      });

      const allTransactions = response.data || [];
      console.log(`Exporting ${allTransactions.length} transactions`);

      // Create CSV content
      const headers = [
        'Order Number',
        'Date',
        'Time',
        'Order Type',
        'Status',
        'Items',
        'Subtotal',
        'Tax Amount',
        'Total Amount',
        'Amount Paid',
        'Change Amount',
        'Cashier',
        'Manager',
        'Remittance Status',
        'Created At',
      ];

      // Format data for CSV
      const csvData = allTransactions.map((transaction) => {
        const formatDate = (dateString) => {
          if (!dateString) return 'N/A';
          try {
            return new Date(dateString).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
          } catch {
            return dateString;
          }
        };

        const formatTime = (dateString) => {
          if (!dateString) return 'N/A';
          try {
            return new Date(dateString).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch {
            return dateString;
          }
        };

        const formatItems = (items) => {
          if (!items || !Array.isArray(items)) return 'No items';
          return items
            .map(
              (item) =>
                `${item.menu_item_name || item.item_name} (${item.quantity}x)`
            )
            .join(', ');
        };

        return [
          transaction.order_number || '',
          formatDate(transaction.created_at),
          formatTime(transaction.created_at),
          transaction.order_type || '',
          transaction.status || '',
          formatItems(transaction.items),
          transaction.subtotal || '',
          transaction.tax_amount || '',
          transaction.total_amount || '',
          transaction.amount_paid || '',
          transaction.change_amount || '',
          `${transaction.cashier_first_name || ''} ${transaction.cashier_last_name || ''}`.trim(),
          `${transaction.manager_first_name || ''} ${transaction.manager_last_name || ''}`.trim(),
          transaction.remittance_status || '',
          transaction.created_at || '',
        ];
      });

      // Add summary data
      const summaryRows = [
        [],
        ['SUMMARY'],
        ['Total Orders', allTransactions.length],
        [
          'Completed Orders',
          allTransactions.filter((t) => t.status === 'completed').length,
        ],
        [
          'Void Orders',
          allTransactions.filter((t) => t.status === 'void').length,
        ],
        [
          'Total Sales Amount',
          `P${allTransactions.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0).toFixed(2)}`,
        ],
        [
          'Total Amount Paid',
          `P${allTransactions.reduce((sum, t) => sum + parseFloat(t.amount_paid || 0), 0).toFixed(2)}`,
        ],
        [
          'Total Change Given',
          `P${allTransactions.reduce((sum, t) => sum + parseFloat(t.change_amount || 0), 0).toFixed(2)}`,
        ],
        [],
        ['BY ORDER TYPE'],
      ];

      // Group by order type
      const typeGroups = allTransactions.reduce((acc, t) => {
        const type = t.order_type || 'Unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(t);
        return acc;
      }, {});

      Object.entries(typeGroups).forEach(([type, orders]) => {
        const totalAmount = orders.reduce(
          (sum, t) => sum + parseFloat(t.total_amount || 0),
          0
        );
        const totalPaid = orders.reduce(
          (sum, t) => sum + parseFloat(t.amount_paid || 0),
          0
        );
        summaryRows.push([
          `${type}`,
          `${orders.length} orders`,
          `P${totalAmount.toFixed(2)}`,
          `P${totalPaid.toFixed(2)}`,
        ]);
      });

      // Combine headers, data, and summary
      const csvContent = [headers, ...csvData, ...summaryRows]
        .map((row) =>
          row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      // Create filename based on current filter
      const periodName = getFilterDisplayText();
      const filename = `Sales_Transactions_${periodName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

      // Create and download file with BOM for better Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(
        `Successfully exported ${allTransactions.length} transactions to ${filename}`
      );
    } catch (error) {
      console.error('Error exporting transactions:', error);
      alert('Failed to export transactions. Please try again.');
    } finally {
      isExporting.value = false;
    }
  };

  // Function to get the correct base URL for QR codes
  const getQRBaseUrl = () => {
    // In development, use the network IP so phones can access it
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      // For local development, use the network IP so phones can access it
      return `http://192.168.18.5:8080`;
    }
    // In production, use the current origin
    return window.location.origin;
  };

  // Receipt functionality
  const showReceipt = (order) => {
    selectedReceiptOrder.value = order;
    // Generate QR data for rating the order
    receiptQRData.value = `${getQRBaseUrl()}/rate-order?order=${encodeURIComponent(order.order_number)}`;

    // Close the Sales Transactions modal and mark for reopening
    shouldReopenModal.value = true;
    closeModal();

    // Show receipt modal after a short delay
    setTimeout(() => {
      showReceiptModal.value = true;
    }, 100);
  };

  const closeReceiptModal = () => {
    showReceiptModal.value = false;
    selectedReceiptOrder.value = null;
    receiptQRData.value = '';

    // Reopen the Sales Transactions modal if it was closed for the receipt
    if (shouldReopenModal.value) {
      shouldReopenModal.value = false;
      setTimeout(() => {
        // Emit event to parent to reopen the modal
        emit('reopen');
      }, 100);
    }
  };

  const printReceipt = async (order) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    // Get the receipt content with QR code
    const receiptContent = await generateReceiptHTMLWithQR(order);

    printWindow.document.write(receiptContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const generateReceiptHTMLWithQR = async (order) => {
    const branchName = context.currentBranch?.name || 'Branch';
    const currentDate = new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Generate QR data for the order
    const qrData = `${getQRBaseUrl()}/rate-order?order=${encodeURIComponent(order.order_number)}`;

    // Generate QR code as data URL
    let qrCodeDataURL = '';
    try {
      const QRCode = await import('qrcode');
      qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      console.error('Error generating QR code for print:', error);
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.order_number}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            max-width: 300px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .company-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
          }
          .branch-name {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .order-info {
            margin-bottom: 15px;
          }
          .order-info div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .items {
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .item-name {
            flex: 1;
          }
          .item-qty {
            margin: 0 10px;
          }
          .item-price {
            text-align: right;
            min-width: 60px;
          }
          .totals {
            text-align: right;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .grand-total {
            border-top: 1px solid #000;
            padding-top: 5px;
            font-weight: bold;
            font-size: 14px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            font-size: 10px;
          }
          .qr-section {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
          }
          .qr-text {
            font-size: 9px;
            margin-bottom: 5px;
            color: #666;
          }
          .qr-code {
            width: 80px;
            height: 80px;
            margin: 0 auto 5px;
            display: block;
          }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Countryside Steakhouse</div>
          <div class="branch-name">${branchName}</div>
          <div>Receipt</div>
        </div>
        
        <div class="order-info">
          <div>
            <span>Order #:</span>
            <span>${order.order_number}</span>
          </div>
          <div>
            <span>Date:</span>
            <span>${currentDate}</span>
          </div>
          <div>
            <span>Cashier:</span>
            <span>${order.cashier}</span>
          </div>
          <div>
            <span>Status:</span>
            <span style="color: ${order.status === 'void' ? '#dc2626' : '#000'}; font-weight: ${order.status === 'void' ? 'bold' : 'normal'};">${order.status}</span>
          </div>
          ${
            order.status === 'void' && order.void_reason
              ? `
          <div>
            <span>Reason:</span>
            <span style="color: #dc2626; font-weight: bold; font-size: 11px;">${order.void_reason}</span>
          </div>
          `
              : ''
          }
        </div>
        
        <div class="items">
          ${
            order.items
              ? order.items
                  .map(
                    (item) => `
            <div class="item">
              <div class="item-name">${item.menu_item_name || item.item_name}</div>
              <div class="item-qty">${item.quantity}x</div>
              <div class="item-price">₱${(parseFloat(item.price) || 0).toFixed(2)}</div>
            </div>
           `
                  )
                  .join('')
              : '<div>No items</div>'
          }
        </div>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>₱${(order.amount || 0).toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>Amount Paid:</span>
            <span>₱${(order.amount_paid || 0).toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>Change:</span>
            <span>₱${(order.change_amount || 0).toFixed(2)}</span>
          </div>
          <div class="total-line grand-total">
            <span>Total:</span>
            <span>₱${(order.amount || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <div>Thank you for your business!</div>
          <div>Generated on ${currentDate}</div>
        </div>
        
        <div class="qr-section">
          <div class="qr-text">Rate your experience</div>
          ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" alt="QR Code" class="qr-code" />` : '<div class="qr-placeholder">QR Code</div>'}
          <div class="qr-text">Scan to rate your order</div>
        </div>
      </body>
      </html>
    `;
  };
</script>

<template>
  <dialog id="branch_sales_transaction_modal" class="modal">
    <div class="modal-box max-w-7xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          <ShoppingCart class="w-5 h-5 mr-2" />
          Sales Transactions
        </h3>
        <button class="btn btn-ghost btn-sm" @click="closeModal">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
        <label class="input input-bordered flex items-center gap-2 col-span-2">
          <Search class="w-4 h-4" />
          <input
            v-model="filters.search"
            @keyup.enter="fetchTransactions"
            type="text"
            class="grow"
            placeholder="Search order number or items"
          />
        </label>

        <select
          v-model="filters.status"
          class="select select-bordered select-sm sm:select-md"
        >
          <option
            v-for="status in statusOptions"
            :key="status.value"
            :value="status.value"
          >
            {{ status.label }}
          </option>
        </select>

        <select
          v-model="filters.date_range"
          @change="
            if (filters.date_range !== 'custom_month') {
              applyDateRange();
              fetchTransactions();
            }
          "
          class="select select-bordered select-sm sm:select-md"
        >
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="custom_month">{{ getFilterDisplayText() }}</option>
        </select>
      </div>

      <!-- Custom Month Selection - Only show when Custom Month is selected -->
      <div
        v-if="filters.date_range === 'custom_month'"
        class="flex justify-between items-center gap-2 mb-3"
      >
        <!-- Current Filter Display -->
        <div v-if="filters.custom_month" class="text-sm text-gray-600">
          <span class="font-medium">Selected:</span>
          <span class="text-primaryColor">{{ getFilterDisplayText() }}</span>
        </div>
        <div v-else class="text-sm text-gray-600">
          <span class="font-medium">Select a month:</span>
        </div>

        <div class="relative">
          <button
            class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
            :class="{
              'bg-primaryColor/10': filters.date_range === 'custom_month',
            }"
            @click="toggleCustomMonthPicker"
          >
            <Calendar class="w-4 h-4 mr-1" />
            {{ filters.custom_month ? 'Change Month' : 'Select Month' }}
          </button>

          <!-- Custom Month Picker -->
          <div
            v-if="showCustomMonthPicker"
            class="absolute top-full right-0 mt-1 bg-white border border-primaryColor/30 rounded-lg shadow-lg z-10 p-3 min-w-64"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium text-gray-700">Select Month</h4>
              <button
                @click="showCustomMonthPicker = false"
                class="btn btn-xs btn-ghost"
              >
                <X class="w-3 h-3" />
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label label-text-alt text-gray-600">Month</label>
                <select
                  v-model="customMonthPicker.month"
                  class="select select-bordered select-sm w-full"
                >
                  <option
                    v-for="month in months"
                    :key="month.value"
                    :value="month.value"
                  >
                    {{ month.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="label label-text-alt text-gray-600">Year</label>
                <select
                  v-model="customMonthPicker.year"
                  class="select select-bordered select-sm w-full"
                >
                  <option
                    v-for="year in Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - 2 + i
                    )"
                    :key="year"
                    :value="year"
                  >
                    {{ year }}
                  </option>
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-3">
              <button
                @click="showCustomMonthPicker = false"
                class="btn btn-sm btn-ghost"
              >
                Cancel
              </button>
              <button
                @click="applyCustomMonthFilter"
                class="btn btn-sm bg-primaryColor text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 mb-3">
        <button
          class="btn btn-ghost btn-sm font-thin hover:bg-gray-100"
          @click="clearFilters"
        >
          Clear
        </button>
        <button
          class="btn btn-outline btn-sm font-thin"
          @click="exportTransactions"
          :disabled="isExporting || loading"
        >
          <span
            v-if="isExporting"
            class="loading loading-spinner loading-xs mr-1"
          ></span>
          <Download v-else class="w-4 h-4 mr-1" />
          {{ isExporting ? 'Exporting...' : 'Export' }}
        </button>
        <button
          class="btn bg-primaryColor text-white btn-sm font-thin hover:bg-primaryColor/80"
          :disabled="loading"
          @click="fetchTransactions"
        >
          <Filter class="w-4 h-4 mr-1" />
          Apply
        </button>
      </div>

      <div v-if="loading" class="py-8 flex justify-center">
        <span class="loading loading-spinner" />
      </div>

      <div v-else>
        <div v-if="transactions.length === 0" class="py-10">
          <div class="text-center text-gray-500">No transactions found</div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Items</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>VAT-Exempt</th>
                <th>SC/PWD</th>
                <th>Paid Amount</th>
                <th>Change</th>
                <th>Cashier</th>
                <th>Type</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transaction in transactions" :key="transaction.id">
                <td>
                  <div class="font-mono text-sm">
                    {{ transaction.order_number }}
                  </div>
                </td>
                <td>
                  <div class="text-sm max-w-sm">
                    <div
                      v-if="transaction.items && transaction.items.length > 0"
                      class="space-y-1"
                    >
                      <div
                        v-for="item in transaction.items"
                        :key="item.id || item.menu_item_id"
                        class="flex items-center justify-between"
                      >
                        <span class="font-medium">{{
                          item.menu_item_name || item.item_name
                        }}</span>
                        <span class="text-gray-500 ml-2"
                          >{{ item.quantity }}x</span
                        >
                      </div>
                    </div>
                    <div v-else class="text-gray-400">No items</div>
                  </div>
                </td>
                <td class="whitespace-nowrap">
                  {{ transaction.date }}
                </td>
                <td class="whitespace-nowrap">
                  {{ transaction.time }}
                </td>
                <td>
                  <div class="font-semibold text-primaryColor">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      isNaN(transaction.amount)
                        ? '0.00'
                        : transaction.amount.toFixed(2)
                    }}
                  </div>
                </td>
                <td>
                  <div
                    class="text-xs"
                    :class="
                      transaction.is_vat_exempt
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    "
                  >
                    {{ transaction.is_vat_exempt ? 'Yes' : 'No' }}
                  </div>
                </td>
                <td>
                  <div class="text-xs">
                    <span
                      v-if="
                        transaction.discount_type &&
                        transaction.discount_type !== 'NONE'
                      "
                      class="badge badge-xs bg-emerald-100 text-emerald-700 border border-emerald-200"
                      >{{ transaction.discount_type }}</span
                    >
                    <span v-else class="text-gray-400">-</span>
                  </div>
                </td>
                <td>
                  <div class="font-thin text-gray-600">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      isNaN(transaction.amount_paid)
                        ? '0.00'
                        : transaction.amount_paid.toFixed(2)
                    }}
                  </div>
                </td>
                <td>
                  <div class="font-thin text-gray-600">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      isNaN(transaction.change_amount)
                        ? '0.00'
                        : transaction.change_amount.toFixed(2)
                    }}
                  </div>
                </td>
                <td>
                  <div class="text-sm">{{ transaction.cashier }}</div>
                </td>
                <td>
                  <div class="text-sm">{{ transaction.order_type }}</div>
                </td>
                <td>
                  <div v-if="transaction.status === 'void'">
                    <div
                      :class="[
                        'badge badge-sm mb-1 flex items-center gap-1 cursor-pointer',
                        transaction.isRefunded
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200',
                      ]"
                      :title="
                        transaction.isRefunded
                          ? transaction.completed_at
                            ? 'Refunded (Inventory deducted • Loss recorded)'
                            : 'Refunded (No inventory deduction • No loss)'
                          : transaction.void_reason
                      "
                    >
                      <font-awesome-icon
                        :icon="
                          transaction.isRefunded
                            ? 'fa-solid fa-undo'
                            : 'fa-solid fa-exclamation-triangle'
                        "
                        class="w-3 h-3"
                      />
                      {{ transaction.isRefunded ? 'Refunded' : 'Loss' }}
                    </div>
                  </div>
                  <div v-else>
                    <div
                      :class="[
                        'badge badge-sm',
                        getStatusInfo(transaction.status).badge,
                      ]"
                    >
                      {{ getStatusInfo(transaction.status).label }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="flex space-x-1">
                    <button
                      @click="showReceipt(transaction)"
                      class="btn btn-xs btn-info text-info font-thin bg-info/20 shadow-none border-none"
                      title="View Receipt"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-receipt"
                        class="w-3 h-3"
                      />
                    </button>
                    <button
                      @click="printReceipt(transaction)"
                      class="btn btn-xs btn-secondary text-secondary font-thin bg-secondary/20 shadow-none border-none"
                      title="Print Receipt"
                    >
                      <Printer class="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="flex items-center justify-between mt-3">
            <div class="text-sm text-gray-500">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} -
              {{ Math.min(currentPage * itemsPerPage, totalTransactions) }} of
              {{ totalTransactions }}
            </div>
            <div class="join">
              <button
                class="btn btn-sm join-item"
                :disabled="currentPage === 1"
                @click="prevPage"
              >
                «
              </button>
              <button
                class="btn btn-sm join-item"
                :class="{ 'btn-active': currentPage === 1 }"
                @click="
                  () => {
                    currentPage = 1;
                    fetchTransactions();
                  }
                "
              >
                1
              </button>
              <button
                v-if="showLeftEllipsis()"
                class="btn btn-sm join-item"
                disabled
              >
                …
              </button>
              <button
                v-for="p in getPageRange()"
                :key="p"
                class="btn btn-sm join-item"
                :class="{ 'btn-active': currentPage === p }"
                @click="
                  () => {
                    currentPage = p;
                    fetchTransactions();
                  }
                "
              >
                {{ p }}
              </button>
              <button
                v-if="showRightEllipsis()"
                class="btn btn-sm join-item"
                disabled
              >
                …
              </button>
              <button
                v-if="totalPages > 1"
                class="btn btn-sm join-item"
                :class="{ 'btn-active': currentPage === totalPages }"
                @click="
                  () => {
                    currentPage = totalPages;
                    fetchTransactions();
                  }
                "
              >
                {{ totalPages }}
              </button>
              <button
                class="btn btn-sm join-item"
                :disabled="currentPage === totalPages"
                @click="nextPage"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="closeModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>

  <!-- Receipt Modal -->
  <div
    v-if="showReceiptModal"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto transform transition-all p-3 sm:p-4 lg:p-6 max-h-[95vh] overflow-y-auto"
    >
      <!-- Receipt Content -->
      <div class="receipt-content bg-gray-50 rounded-lg p-4 mb-4">
        <div
          class="text-center border-b border-dashed border-gray-400 pb-3 mb-4"
        >
          <div class="font-bold text-lg mb-1">Countryside Steakhouse</div>
          <div class="text-sm text-gray-600">
            {{ context.currentBranch?.name }}
          </div>
          <div class="text-xs text-gray-500">Receipt</div>
        </div>

        <div class="space-y-2 mb-4 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Order #:</span>
            <span class="font-mono">{{
              selectedReceiptOrder?.order_number
            }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Date:</span>
            <span
              >{{ selectedReceiptOrder?.date }}
              {{ selectedReceiptOrder?.time }}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Cashier:</span>
            <span>{{ selectedReceiptOrder?.cashier }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span
              class="capitalize font-medium"
              :class="{
                'text-red-600': selectedReceiptOrder?.status === 'void',
                'text-gray-900': selectedReceiptOrder?.status !== 'void',
              }"
            >
              {{ selectedReceiptOrder?.status }}
            </span>
          </div>
          <div
            v-if="
              selectedReceiptOrder?.status === 'void' &&
              selectedReceiptOrder?.void_reason
            "
            class="flex justify-between"
          >
            <span class="text-gray-600">Reason:</span>
            <span class="text-red-600 font-medium text-sm">
              {{ selectedReceiptOrder.void_reason }}
            </span>
          </div>
        </div>

        <div class="border-b border-dashed border-gray-400 pb-3 mb-4">
          <div class="text-sm font-medium mb-2">Items:</div>
          <div
            v-if="
              selectedReceiptOrder?.items &&
              selectedReceiptOrder.items.length > 0
            "
            class="space-y-1"
          >
            <div
              v-for="item in selectedReceiptOrder.items"
              :key="item.id || item.menu_item_id"
              class="flex justify-between text-sm"
            >
              <div class="flex-1">
                <span>{{ item.menu_item_name || item.item_name }}</span>
                <span class="text-gray-500 ml-2">x{{ item.quantity }}</span>
              </div>
              <div class="text-right">
                ₱{{ (parseFloat(item.price) || 0).toFixed(2) }}
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">No items</div>
        </div>

        <div class="text-right space-y-1 text-sm">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span>₱{{ (selectedReceiptOrder?.amount || 0).toFixed(2) }}</span>
          </div>
          <div class="flex justify-between">
            <span>Amount Paid:</span>
            <span
              >₱{{ (selectedReceiptOrder?.amount_paid || 0).toFixed(2) }}</span
            >
          </div>
          <div class="flex justify-between">
            <span>Change:</span>
            <span
              >₱{{
                (selectedReceiptOrder?.change_amount || 0).toFixed(2)
              }}</span
            >
          </div>
          <div
            class="flex justify-between border-t border-gray-400 pt-2 font-bold"
          >
            <span>Total:</span>
            <span>₱{{ (selectedReceiptOrder?.amount || 0).toFixed(2) }}</span>
          </div>
        </div>

        <div
          class="text-center mt-4 pt-3 border-t border-dashed border-gray-400"
        >
          <div class="text-xs text-gray-500">Thank you for your business!</div>
          <div class="text-xs text-gray-400 mt-1">
            Generated on
            {{
              new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
            }}
          </div>
        </div>

        <!-- QR Code Section -->
        <div
          class="text-center mt-4 pt-3 border-t border-dashed border-gray-400"
        >
          <div class="text-xs text-gray-500 mb-2">Rate your experience</div>
          <div class="flex justify-center mb-2">
            <div class="w-24 h-24 flex items-center justify-center">
              <QRCodeGenerator
                v-if="receiptQRData"
                :data="receiptQRData"
                :size="96"
                class="max-w-full max-h-full"
              />
              <div
                v-else
                class="w-24 h-24 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400"
              >
                QR Code
              </div>
            </div>
          </div>
          <div class="text-xs text-gray-500">Scan to rate your order</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          @click="closeReceiptModal"
          class="flex-1 btn btn-outline btn-sm font-thin"
        >
          Close
        </button>
        <button
          @click="printReceipt(selectedReceiptOrder)"
          class="flex-1 btn bg-primaryColor text-white btn-sm font-thin hover:bg-primaryColor/80 flex items-center justify-center gap-2"
        >
          <Printer class="w-4 h-4" />
          Print Receipt
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
