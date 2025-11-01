<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    CreditCard,
    Package,
    Users,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    Shield,
    UserX,
    Plus,
    Minus,
    X,
    Receipt,
    ShoppingCart,
    Maximize2,
    Minimize2,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useBranchStore } from '../../stores/branchStore';
  import { useAuthStore } from '../../stores/authStore';
  import { usePOSSessionStore } from '../../stores/posSessionStore';
  import { usePOSStore } from '../../stores/posStore';
  import { useCustomToast } from '../../composables/useCustomToast';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';
  import QRCodeGenerator from '../../components/common/QRCodeGenerator.vue';
  import POSTransactionModal from '../../components/branch/POSTransactionModal.vue';

  const branchContextStore = useBranchContextStore();
  const branchStore = useBranchStore();
  const authStore = useAuthStore();
  const posSessionStore = usePOSSessionStore();
  const posStore = usePOSStore();
  const router = useRouter();
  const { showSuccess, showError } = useCustomToast();
  const API_BASE_URL = apiConfig.baseURL;

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

  // Local state
  const loading = ref(false);
  const accessDenied = ref(false);
  const needsManagerLogin = ref(false);
  const managerLoginForm = ref({
    employeeId: '',
  });
  const managerLoginError = ref('');
  const showEmployeeId = ref(false);
  const stats = ref({
    todaySales: 0,
    todayTransactions: 0,
    averageTransaction: 0,
    activeOrders: 0,
  });
  const statsLoading = ref(false);
  const branchStatus = ref('Open');
  const isUpdatingStatus = ref(false);
  const isFullscreen = ref(false);
  const showStatusConfirmationModal = ref(false);
  const pendingStatusChange = ref(null);
  const displayToggleState = ref(true); // For visual toggle display

  // POS UI state
  const showOrderCompleteModal = ref(false);
  const showOrderConfirmationModal = ref(false);
  const showReceiptModal = ref(false);
  const showVoidOrderModal = ref(false);
  const orderCompleteData = ref(null);
  const orderConfirmationData = ref(null);
  const confirmationOrderType = ref('Dine In');
  const paymentInput = ref('');
  const isProcessingOrder = ref(false);
  const receiptData = ref(null);
  const voidOrderData = ref(null);
  const voidReason = ref('');
  const showTransactionModal = ref(false);
  const showItemConfirmationModal = ref(false);
  const selectedMenuItem = ref(null);
  const itemQuantity = ref(1);

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => authStore.userRole);
  const user = computed(() => authStore.user);

  // POS Access Control
  const canAccessPOS = computed(() => {
    const allowedRoles = ['Manager', 'Cashier'];
    return allowedRoles.includes(userRole.value);
  });

  // Check if manager session is active
  const isManagerSessionActive = computed(
    () => posSessionStore.isSessionActive
  );
  const managerInfo = computed(() => posSessionStore.managerInfo);
  const sessionTimeRemaining = computed(
    () => posSessionStore.sessionTimeRemainingMinutes
  );

  // Manager login via Employee ID only
  const handleManagerLogin = async () => {
    managerLoginError.value = '';

    const employeeId = managerLoginForm.value.employeeId?.trim();

    if (!employeeId) {
      managerLoginError.value = 'Employee ID is required';
      return;
    }

    try {
      // Fetch employee by employee_id
      const res = await axios.get(
        `${API_BASE_URL}/employees/employee-id/${encodeURIComponent(employeeId)}`
      );
      const employee = res.data?.data;

      if (!employee) {
        managerLoginError.value = 'Employee not found';
        return;
      }

      // Role and status checks
      if (employee.role !== 'Manager') {
        managerLoginError.value = 'Only a Manager can start a POS session';
        return;
      }

      if (!employee.branch_id || employee.branch_id !== user.value.branch_id) {
        managerLoginError.value = 'Manager must belong to this branch';
        return;
      }

      // Start manager session (local only)
      posSessionStore.startManagerSession({
        id: employee.id,
        name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        role: employee.role,
        branch_id: employee.branch_id,
        email: employee.email,
        loginTime: new Date().toISOString(),
      });

      needsManagerLogin.value = false;
      managerLoginForm.value = { employeeId: '' };
      // Load POS data immediately after session activation
      await startPOSDataLoad();
    } catch (err) {
      console.error('POS manager PIN login failed:', err);
      managerLoginError.value =
        err.response?.data?.message || 'Unable to verify manager';
    }
  };

  const handleManagerLogout = () => {
    posSessionStore.endManagerSession();
    needsManagerLogin.value = true;
  };

  // Session validation and access control
  const validatePOSAccess = () => {
    // Check if user is authenticated
    if (!authStore.isAuthenticated || !user.value) {
      accessDenied.value = true;
      return false;
    }

    // Check if user has branch assignment
    if (!user.value.branch_id) {
      accessDenied.value = true;
      return false;
    }

    // Check if user role can access POS
    if (!canAccessPOS.value) {
      accessDenied.value = true;
      return false;
    }

    // Check manager session requirement
    if (userRole.value === 'Cashier' && !isManagerSessionActive.value) {
      needsManagerLogin.value = true;
      return false;
    }

    // If user is Manager and no session exists, they can start one
    if (userRole.value === 'Manager' && !isManagerSessionActive.value) {
      needsManagerLogin.value = true;
      return false;
    }

    return true;
  };

  // Session timeout check
  const checkSessionTimeout = () => {
    if (isManagerSessionActive.value && sessionTimeRemaining.value <= 0) {
      posSessionStore.endManagerSession();
      needsManagerLogin.value = true;
    }
  };

  // Set up session timeout monitoring
  let sessionTimeoutInterval = null;

  // POS Methods
  const handleAddToOrder = (menuItem) => {
    // Check if item is available
    if (menuItem.stock_quantity <= 0 || menuItem.is_expired) {
      console.warn('Item is out of stock or expired');
      return;
    }

    // Show confirmation modal
    selectedMenuItem.value = menuItem;
    itemQuantity.value = 1;
    showItemConfirmationModal.value = true;
  };

  const confirmAddToOrder = () => {
    if (!selectedMenuItem.value || itemQuantity.value <= 0) {
      return;
    }

    // Add item with specified quantity
    const success = posStore.addItemToOrder(
      selectedMenuItem.value,
      itemQuantity.value
    );
    if (!success) {
      console.warn('Failed to add item to order');
    }

    // Close modal and reset
    closeItemConfirmationModal();
  };

  const closeItemConfirmationModal = () => {
    showItemConfirmationModal.value = false;
    selectedMenuItem.value = null;
    itemQuantity.value = 1;
  };

  const updateItemQuantity = (change) => {
    const newQuantity = itemQuantity.value + change;
    if (
      newQuantity > 0 &&
      newQuantity <= (selectedMenuItem.value?.stock_quantity || 999)
    ) {
      itemQuantity.value = newQuantity;
    }
  };

  const validateQuantity = () => {
    const maxStock = selectedMenuItem.value?.stock_quantity || 999;
    if (itemQuantity.value < 1) {
      itemQuantity.value = 1;
    } else if (itemQuantity.value > maxStock) {
      itemQuantity.value = maxStock;
    }
  };

  const handleRemoveFromOrder = (itemId) => {
    posStore.removeItemFromOrder(itemId);
  };

  const handleUpdateQuantity = (itemId, quantity) => {
    posStore.updateItemQuantity(itemId, quantity);
  };

  // Calculate discounted price for promo items (for cart items with quantity)
  const calculateDiscountedPrice = (item) => {
    if (
      !item.promo_info ||
      !item.promo_info.is_active ||
      item.quantity < item.promo_info.minimum_quantity
    ) {
      return parseFloat(item.price || 0);
    }

    const originalPrice = parseFloat(item.price || 0);
    let discountAmount = 0;

    if (item.promo_info.discount_type === 'percentage') {
      discountAmount =
        originalPrice * (item.promo_info.discount_percentage / 100);
    } else if (item.promo_info.discount_type === 'fixed_amount') {
      discountAmount = parseFloat(item.promo_info.discount_amount || 0);
    }

    return Math.max(0, originalPrice - discountAmount);
  };

  // Calculate discounted price for menu items (for display in grid)
  const calculateMenuDiscountedPrice = (item) => {
    if (!item.promo_info || !item.promo_info.is_active) {
      return parseFloat(item.price || 0);
    }

    const originalPrice = parseFloat(item.price || 0);
    let discountAmount = 0;

    if (item.promo_info.discount_type === 'percentage') {
      discountAmount =
        originalPrice *
        (parseFloat(item.promo_info.discount_percentage || 0) / 100);
    } else if (item.promo_info.discount_type === 'fixed_amount') {
      discountAmount = parseFloat(item.promo_info.discount_amount || 0);
    }

    return Math.max(0, originalPrice - discountAmount);
  };

  const handleOrderTypeChange = (type) => {
    posStore.setOrderType(type);
  };

  const handlePaymentInput = (value) => {
    paymentInput.value = value;
    posStore.setAmountPaid(value);
  };

  const processOrder = async () => {
    if (posStore.currentOrder.items.length === 0) {
      alert('Please add items to the order');
      return;
    }

    // Show confirmation modal first
    orderConfirmationData.value = {
      orderNumber: posStore.getNextOrderNumber(),
      orderType: posStore.currentOrder.orderType,
      items: posStore.currentOrder.items,
      subtotal: posStore.orderTotal,
      amountPaid: 0, // Will be set by user in modal
      change: 0, // Will be calculated in modal
      cashierInfo: { name: user.value?.name },
      timestamp: new Date().toLocaleString(),
    };
    confirmationOrderType.value = posStore.currentOrder.orderType;
    paymentInput.value = ''; // Reset payment input
    showOrderConfirmationModal.value = true;
  };

  // Reactive confirmation totals (PH): apply SC/PWD only to beneficiary's own meal
  // Highest-priced single item gets VAT-exempt + 20% discount; companions are regular.
  const confirmIsVatExempt = computed(
    () => posStore.discountType === 'SC' || posStore.discountType === 'PWD'
  );
  const confirmGross = computed(() => posStore.orderSubtotal);
  const highestUnitPrice = computed(() => {
    const items = posStore.currentOrder.items || [];
    if (!items.length) return 0;
    return items.reduce((max, it) => {
      const p = parseFloat(it.price || 0);
      return p > max ? p : max;
    }, 0);
  });
  // Single meal base without VAT
  const confirmVatExemptItemBase = computed(() =>
    confirmIsVatExempt.value
      ? Number((highestUnitPrice.value / 1.12).toFixed(2))
      : 0
  );
  const confirmRemovedVatOnItem = computed(() =>
    confirmIsVatExempt.value
      ? Number(
          (highestUnitPrice.value - highestUnitPrice.value / 1.12).toFixed(2)
        )
      : 0
  );
  const confirmDiscountAmount = computed(() =>
    confirmIsVatExempt.value
      ? Number((0.2 * confirmVatExemptItemBase.value).toFixed(2))
      : 0
  );
  const confirmTotalDue = computed(() => {
    if (!confirmIsVatExempt.value) return Number(confirmGross.value.toFixed(2));
    const due =
      confirmGross.value -
      confirmRemovedVatOnItem.value -
      confirmDiscountAmount.value;
    return Number(due.toFixed(2));
  });
  const confirmChange = computed(() =>
    Number(
      Math.max(
        0,
        (parseFloat(paymentInput.value) || 0) - confirmTotalDue.value
      ).toFixed(2)
    )
  );

  const confirmOrder = async () => {
    // Validate payment amount
    const amountPaid = parseFloat(paymentInput.value) || 0;
    const subtotal = parseFloat(orderConfirmationData.value?.subtotal || 0);

    if (amountPaid <= 0) {
      alert('Please enter the amount paid');
      return;
    }

    if (amountPaid < subtotal) {
      alert('Amount paid cannot be less than the total amount');
      return;
    }

    isProcessingOrder.value = true;
    try {
      // Set the payment amount in the store
      posStore.setAmountPaid(amountPaid);

      // Ensure selected order type in confirmation is applied
      if (
        confirmationOrderType.value &&
        confirmationOrderType.value !== posStore.currentOrder.orderType
      ) {
        posStore.setOrderType(confirmationOrderType.value);
      }
      const orderData = await posStore.processOrder();
      orderCompleteData.value = orderData;
      showOrderConfirmationModal.value = false;
      showOrderCompleteModal.value = true;
      paymentInput.value = '';

      // Update stats after successful order
      await fetchTodayStats();
    } catch (error) {
      console.error('Error processing order:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to process order. Please try again.';
      alert(errorMessage);
    } finally {
      isProcessingOrder.value = false;
    }
  };

  const closeOrderCompleteModal = () => {
    showOrderCompleteModal.value = false;
    orderCompleteData.value = null;
  };

  const closeOrderConfirmationModal = () => {
    showOrderConfirmationModal.value = false;
    orderConfirmationData.value = null;
  };

  const showReceipt = () => {
    if (orderCompleteData.value) {
      // Calculate VAT breakdown for visualization using backend-provided fields when available
      const totalAmount = parseFloat(orderCompleteData.value.total_amount || 0);
      const vatRate = 0.12; // 12% VAT
      const isVatExempt = Boolean(orderCompleteData.value.is_vat_exempt);
      const subtotalBeforeVat = isVatExempt
        ? parseFloat(orderCompleteData.value.vat_exempt_sales || 0)
        : totalAmount / (1 + vatRate);
      const vatAmount = isVatExempt ? 0 : totalAmount - subtotalBeforeVat;

      receiptData.value = {
        ...orderCompleteData.value,
        cashierName: user.value?.name,
        branchName: currentBranch.value?.name,
        branchLocation:
          currentBranch.value?.location || currentBranch.value?.address,
        orderType: confirmationOrderType.value,
        timestamp: new Date().toLocaleString(),
        qrData: `${getQRBaseUrl()}/rate-order?order=${encodeURIComponent(orderCompleteData.value.order_number)}`,
        // VAT breakdown for visualization
        subtotalBeforeVat: subtotalBeforeVat,
        vatAmount: vatAmount,
        vatRate: vatRate,
        discountType: orderCompleteData.value.discount_type || 'NONE',
        beneficiaryName: orderCompleteData.value.beneficiary_name || null,
        beneficiaryIdNo: orderCompleteData.value.beneficiary_id_no || null,
        discountAmount: parseFloat(
          orderCompleteData.value.discount_amount || 0
        ),
        isVatExempt: isVatExempt,
      };
      showReceiptModal.value = true;
    }
  };

  const closeReceiptModal = () => {
    showReceiptModal.value = false;
    receiptData.value = null;
  };

  const printReceipt = () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) {
      console.error('Print area not found');
      return;
    }

    // Extract QR image (if rendered as canvas)
    let qrImgHtml = '';
    try {
      const qrCanvas = printArea.querySelector('canvas');
      if (qrCanvas && typeof qrCanvas.toDataURL === 'function') {
        const dataUrl = qrCanvas.toDataURL('image/png');
        qrImgHtml = `<div style="text-align:center;margin-top:8px"><img src="${dataUrl}" alt="QR" style="width:120px;height:120px;object-fit:contain"/></div>`;
      }
    } catch {}

    const r = receiptData.value || {};
    const items = Array.isArray(r.items) ? r.items : [];

    const currency = (n) => `₱${parseFloat(n || 0).toFixed(2)}`;

    const itemsRows = items
      .map((it) => {
        const name = it.item_name || it.name || '';
        const qty = it.quantity || 0;
        const total =
          it.total_price != null ? it.total_price : (it.price || 0) * qty;
        return `<tr>
          <td style="padding:4px 0;word-break:break-word">${name}</td>
          <td style="padding:4px 0;text-align:center">${qty} ×</td>
          <td style="padding:4px 0;text-align:right">${currency(total)}</td>
        </tr>`;
      })
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt</title>
    <style>
      @page { margin: 5mm; }
      html, body { height: 100%; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; color: #111; }
      .receipt { max-width: 80mm; width: 100%; margin: 0 auto; padding: 4mm 0; }
      .h { text-align: center; }
      .h .title { font-size: 16px; font-weight: 700; margin: 0 0 2mm; }
      .h .muted { font-size: 12px; }
      .meta { font-size: 11px; color: #444; display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; }
      .section { margin-top: 3mm; }
      .line { border-top: 1px dashed #bbb; margin: 3mm 0; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { font-weight: 600; }
      .totals table td { padding: 3px 0; }
      .muted { color: #555; font-weight: 500; }
      .center { text-align: center; }
      .thanks { margin-top: 6mm; font-size: 11px; text-align: center; color: #333; }
      .note { font-size: 10px; color: #666; text-align: center; margin-top: 2mm; }
      /* Ensure single-page print */
      .receipt, .section, table, tr, td { page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <div class="receipt">
      <div class="h">
        <div class="title">Countryside Steak House</div>
        <div class="muted">${r.branchName || ''}</div>
        <div class="muted">${r.branchLocation || ''}</div>
        <div class="muted">${r.timestamp || ''}</div>
      </div>

      <div class="section meta">
        <div>Order #:</div><div>${r.order_number || ''}</div>
        <div>Type:</div><div>${r.orderType || ''}</div>
        <div>Cashier:</div><div>${r.cashierName || ''}</div>
      </div>

      <div class="line"></div>

      <div class="section">
        <table>
          <thead>
            <tr>
              <td class="muted">Item</td>
              <td class="muted" style="text-align:center">Qty</td>
              <td class="muted" style="text-align:right">Total</td>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <div class="line"></div>

      <div class="section totals">
        <table>
          <tr><td>${r.isVatExempt ? 'VAT-Exempt Sales:' : 'Subtotal:'}</td><td style="text-align:right">${currency(r.subtotalBeforeVat)}</td></tr>
          ${r.discountType && r.discountType !== 'NONE' ? `<tr><td>SC/PWD Discount (20%):</td><td style="text-align:right">-${currency(r.discountAmount)}</td></tr>` : ''}
          ${r.isVatExempt ? '' : `<tr><td>Tax (${((r.vatRate || 0) * 100).toFixed(0)}%):</td><td style="text-align:right">${currency(r.vatAmount)}</td></tr>`}
          <tr><td><strong>Total Amount:</strong></td><td style="text-align:right"><strong>${currency(r.total_amount)}</strong></td></tr>
          <tr><td>Amount Paid:</td><td style="text-align:right">${currency(r.amount_paid)}</td></tr>
          <tr><td><strong>Change:</strong></td><td style="text-align:right"><strong>${currency(r.change_amount)}</strong></td></tr>
        </table>
      </div>

      <div class="line"></div>

      <div class="note" style="margin-top:4mm">Tell us about your visit. Scan the QR code below and share your experience!</div>
      ${qrImgHtml}

      <div class="thanks">Thank you, please come again!</div>
    </div>
  </body>
  </html>`;

    const printWindow = window.open('', '_blank', 'width=480,height=800');
    if (!printWindow) {
      console.error('Unable to open print window');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    closeReceiptModal();
  };

  const resetOrder = () => {
    posStore.resetOrder();
    paymentInput.value = '';
  };

  // Fetch today's sales statistics (from pos_sales_orders via fetchSalesStats)
  const fetchTodayStats = async () => {
    try {
      statsLoading.value = true;
      const branchId = currentBranch.value?.id || user.value?.branch_id;
      if (!branchId) return;

      // Build local 00:00:00 to 23:59:59 range for today
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      const data = await posStore.fetchSalesStats(
        branchId,
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      if (data) {
        stats.value = {
          todaySales: Number(data.total_sales || 0),
          todayTransactions: Number(data.total_orders || 0),
          averageTransaction: Number(data.average_order_value || 0),
          activeOrders: Math.max(
            0,
            Number(data.total_orders || 0) -
              Number(data.completed_orders || 0) -
              Number(data.voided_orders || 0)
          ),
        };
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
    } finally {
      statsLoading.value = false;
    }
  };

  // Void order functionality
  const showVoidOrder = (orderData) => {
    voidOrderData.value = orderData;
    voidReason.value = '';
    showVoidOrderModal.value = true;
  };

  const confirmVoidOrder = async () => {
    if (!voidReason.value.trim()) {
      alert('Please provide a reason for voiding the order');
      return;
    }

    try {
      await posStore.voidOrder(voidOrderData.value.id, voidReason.value);
      showVoidOrderModal.value = false;
      voidOrderData.value = null;
      voidReason.value = '';

      // Update stats after voiding order
      await fetchTodayStats();

      alert('Order voided successfully');
    } catch (error) {
      console.error('Error voiding order:', error);
      alert('Failed to void order. Please try again.');
    }
  };

  const closeVoidOrderModal = () => {
    showVoidOrderModal.value = false;
    voidOrderData.value = null;
    voidReason.value = '';
  };

  // Transaction modal functions
  const showTransactions = () => {
    showTransactionModal.value = true;
  };

  const closeTransactionModal = () => {
    showTransactionModal.value = false;
  };

  const reopenTransactionModal = () => {
    showTransactionModal.value = true;
  };

  // Refresh POS data after transaction operations
  const refreshPOSData = async () => {
    // Reload menu items to reflect latest branch stock without full page reload
    const q = router.currentRoute.value.query || {};
    const menuId = q.menuId ? Number(q.menuId) : undefined;
    const itemCodes = q.codes
      ? String(q.codes)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const branchId = currentBranch.value?.id || user.value?.branch_id;

    // Refetch POS menu with reset so quantities update reactively
    await posStore.fetchMenuItems({ menuId, itemCodes, branchId, reset: true });
    await posStore.fetchCategories();

    await fetchTodayStats();
  };

  // Complete order functionality
  const completeOrder = async (orderData) => {
    try {
      await posStore.completeOrder(orderData.id);

      // Update stats after completing order
      await refreshPOSData();

      alert('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Failed to complete order. Please try again.');
    }
  };

  // Encapsulated POS data bootstrap so we can reuse after manager login
  const startPOSDataLoad = async () => {
    try {
      // Ensure branch context is ready
      if (!branchContextStore.currentBranch) {
        await branchContextStore.initializeBranchContext();
      }

      const q = router.currentRoute.value.query || {};
      const menuId = q.menuId ? Number(q.menuId) : undefined;
      const itemCodes = q.codes
        ? String(q.codes)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const branchId = currentBranch.value?.id || user.value?.branch_id;

      if (!branchId) return;

      await posStore.initialize({ menuId, itemCodes, branchId });
      await fetchTodayStats();
    } catch (e) {
      console.error('Failed to start POS data load:', e);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        isFullscreen.value = true;
      } else {
        await document.exitFullscreen();
        isFullscreen.value = false;
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Handle branch status toggle - show confirmation first
  const handleStatusToggle = (event) => {
    // Prevent the toggle from changing visually until confirmed
    event.preventDefault();

    const newStatus = branchStatus.value === 'Open' ? 'Closed' : 'Open';

    // If already in the requested status, don't do anything
    if (branchStatus.value === newStatus) {
      return;
    }

    pendingStatusChange.value = newStatus;
    showStatusConfirmationModal.value = true;
  };

  // Confirm branch status change
  const confirmStatusChange = async () => {
    if (!pendingStatusChange.value || isUpdatingStatus.value) return;

    const branchId = currentBranch.value?.id || user.value?.branch_id;
    if (!branchId) {
      closeStatusConfirmationModal();
      return;
    }

    isUpdatingStatus.value = true;
    try {
      // Fetch the full branch data first
      const fullBranch = await branchStore.fetchBranchById(branchId);

      // Update with the new status
      await branchStore.updateBranch(branchId, {
        ...fullBranch,
        status: pendingStatusChange.value,
      });
      branchStatus.value = pendingStatusChange.value;
      displayToggleState.value = pendingStatusChange.value === 'Open';
      // Update the branch context to reflect the new status
      if (branchContextStore.currentBranch) {
        branchContextStore.currentBranch.status = pendingStatusChange.value;
      }
      showSuccess(
        `Branch status updated to: ${pendingStatusChange.value}`,
        'Status Updated'
      );
      closeStatusConfirmationModal();
    } catch (error) {
      console.error('Error updating branch status:', error);
      showError(
        'Failed to update branch status. Please try again.',
        'Update Failed'
      );
    } finally {
      isUpdatingStatus.value = false;
    }
  };

  // Close status confirmation modal
  const closeStatusConfirmationModal = () => {
    showStatusConfirmationModal.value = false;
    pendingStatusChange.value = null;
  };

  // Placeholder data
  onMounted(async () => {
    // Validate access first
    if (!validatePOSAccess()) {
      return;
    }

    // Setup infinite scroll on the left menu panel
    const scrollContainer = document.querySelector(
      '.flex-1.p-6.overflow-y-auto'
    );
    const onScroll = async () => {
      if (!scrollContainer) return;
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
        scrollContainer.scrollHeight - 100;
      if (nearBottom && posStore.hasMore && !posStore.loading) {
        await posStore.loadMore({ menuId, itemCodes, branchId });
      }
    };

    // Register cleanup hooks BEFORE any await statements
    onUnmounted(() => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', onScroll);
      }
      if (sessionTimeoutInterval) {
        clearInterval(sessionTimeoutInterval);
      }
    });

    // Initialize branch context if not already set
    if (!branchContextStore.currentBranch) {
      await branchContextStore.initializeBranchContext();
    }

    // Initialize branch status
    if (currentBranch.value?.status) {
      branchStatus.value = currentBranch.value.status;
      displayToggleState.value = currentBranch.value.status === 'Open';
    }

    // Set up fullscreen change listener
    const handleFullscreenChange = () => {
      isFullscreen.value = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    onUnmounted(() => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    // Set up session timeout monitoring
    sessionTimeoutInterval = setInterval(checkSessionTimeout, 60000); // Check every minute

    // Initialize POS store using menuId/itemCodes if provided via route, and branch context for stock basis
    const q = router.currentRoute.value.query || {};
    const menuId = q.menuId ? Number(q.menuId) : undefined;
    const itemCodes = q.codes
      ? String(q.codes)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const branchId = currentBranch.value?.id || user.value?.branch_id;

    await posStore.initialize({ menuId, itemCodes, branchId });

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    }

    // Fetch real POS data
    await fetchTodayStats();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Manager Login Required -->
    <div
      v-if="needsManagerLogin"
      class="min-h-screen flex items-center justify-center py-6 lg:py-12"
    >
      <div class="max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4 w-full">
        <div
          class="p-4 sm:p-6 bg-secondaryColor/10 border border-primaryColor rounded-lg shadow-lg"
        >
          <Shield
            class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-primaryColor mb-4"
          />
          <h2
            class="text-lg sm:text-xl font-bold text-primaryColor mb-2 text-center"
          >
            Manager PIN Required
          </h2>
          <p class="text-sm sm:text-base text-primaryColor mb-4 text-center">
            {{
              userRole === 'Manager'
                ? 'Please enter your PIN to start the POS session'
                : 'A manager must enter their PIN to activate the POS system'
            }}
          </p>

          <div v-if="userRole === 'Manager'" class="space-y-3 sm:space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Manager PIN:</span
                >
              </label>
              <div class="relative">
                <input
                  v-model="managerLoginForm.employeeId"
                  :type="showEmployeeId ? 'text' : 'password'"
                  placeholder="Enter your PIN"
                  class="input input-bordered w-full input-sm sm:input-md pr-10"
                  @keyup.enter="handleManagerLogin"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                  @click="showEmployeeId = !showEmployeeId"
                >
                  <font-awesome-icon
                    :icon="
                      showEmployeeId
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye'
                    "
                  />
                </button>
              </div>
            </div>

            <div v-if="managerLoginError" class="alert alert-error">
              <AlertCircle class="w-4 h-4" />
              <span>{{ managerLoginError }}</span>
            </div>

            <button
              @click="handleManagerLogin"
              class="btn bg-primaryColor text-white w-full font-thin border-none hover:bg-primaryColor/80 btn-sm sm:btn-md"
              :disabled="!managerLoginForm.employeeId"
            >
              <Shield class="w-4 h-4 mr-2" />
              <span class="text-sm sm:text-base">Start POS Session</span>
            </button>
          </div>

          <div v-else class="space-y-3 sm:space-y-4">
            <div class="text-sm text-primaryColor">
              <p>
                <strong>Current User:</strong> {{ user?.name }} ({{ userRole }})
              </p>
              <p><strong>Branch:</strong> {{ currentBranch?.name }}</p>
              <p class="mt-2">
                A manager must enter their PIN to activate the POS system.
              </p>
            </div>

            <div class="divider">Manager PIN Required</div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base">Manager PIN</span>
              </label>
              <div class="relative">
                <input
                  v-model="managerLoginForm.employeeId"
                  :type="showEmployeeId ? 'text' : 'password'"
                  placeholder="Enter manager PIN"
                  class="input input-bordered w-full input-sm sm:input-md pr-10"
                  @keyup.enter="handleManagerLogin"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  @click="showEmployeeId = !showEmployeeId"
                >
                  <font-awesome-icon
                    :icon="
                      showEmployeeId
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye'
                    "
                  />
                </button>
              </div>
            </div>

            <div v-if="managerLoginError" class="alert alert-error">
              <AlertCircle class="w-4 h-4" />
              <span>{{ managerLoginError }}</span>
            </div>

            <button
              @click="handleManagerLogin"
              class="btn bg-primaryColor text-white w-full font-thin border-none hover:bg-primaryColor/80 btn-sm sm:btn-md"
              :disabled="!managerLoginForm.employeeId"
            >
              <Shield class="w-4 h-4 mr-2" />
              <span class="text-sm sm:text-base">Start POS Session</span>
            </button>
          </div>
          <div class="flex justify-center">
            <button
              @click="router.push('/branch/dashboard')"
              class="btn btn-outline btn-sm sm:btn-md mt-4 font-thin"
            >
              <span class="text-sm sm:text-base">Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Access Denied Screen -->
    <div
      v-else-if="accessDenied"
      class="min-h-screen flex items-center justify-center py-6 lg:py-12"
    >
      <div class="max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4 w-full">
        <div class="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg">
          <UserX class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500 mb-4" />
          <h2 class="text-lg sm:text-xl font-bold text-red-800 mb-2">
            Access Denied
          </h2>
          <p class="text-sm sm:text-base text-red-600 mb-4">
            You don't have permission to access the POS system.
          </p>
          <div class="space-y-2 text-xs sm:text-sm text-red-700">
            <p><strong>Required Roles:</strong> Manager or Cashier</p>
            <p><strong>Your Role:</strong> {{ userRole || 'Unknown' }}</p>
            <p v-if="!user?.branch_id">
              <strong>Issue:</strong> No branch assignment
            </p>
          </div>
          <button
            @click="router.push('/branch/dashboard')"
            class="btn btn-outline btn-error mt-4 font-thin btn-sm sm:btn-md"
          >
            <span class="text-sm sm:text-base">Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>

    <!-- POS Interface (only shown if access granted) -->
    <div v-else class="min-h-screen flex flex-col bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b px-4 sm:px-6 py-3 sm:py-4">
        <div class="flex flex-row items-center justify-between gap-2">
          <div class="flex flex-row items-center gap-4">
            <div class="flex flex-row items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
                Point of Sale
              </h1>
              <p class="text-sm sm:text-base text-gray-600">
                ({{
                  currentBranch?.name ||
                  user?.branch_name ||
                  `Branch ${user?.branch_id || 'Unknown'}`
                }}
                )
              </p>
            </div>
            <!-- Branch Status Toggle (Manager only) -->
            <div
              v-if="userRole === 'Manager' && isManagerSessionActive"
              class="flex items-center gap-3 border-l border-gray-300 pl-4"
            >
              <span class="text-xs font-medium text-gray-700">Status:</span>
              <div class="flex items-center gap-2">
                <span
                  class="text-xs font-medium"
                  :class="
                    branchStatus === 'Open' ? 'text-green-600' : 'text-red-600'
                  "
                >
                  {{ branchStatus }}
                </span>
                <input
                  type="checkbox"
                  class="toggle toggle-sm"
                  :class="
                    branchStatus === 'Open' ? 'checked:text-white' : 'toggle-error'
                  "
                  :checked="displayToggleState"
                  @click="handleStatusToggle"
                  :disabled="isUpdatingStatus"
                />
              </div>
            </div>
          </div>
          <div class="flex items-center justify-center space-x-2 sm:space-x-4">
            <div class="text-center">
              <p class="text-base font-medium">
                {{ user?.name }} ({{ userRole }})
              </p>
              <div class="flex gap-2 justify-center mt-2">
                <button
                  @click="showTransactions"
                  class="btn btn-sm"
                  title="View Recent Transactions"
                >
                  <Receipt class="w-4 h-4 mr-1" />
                  Transactions
                </button>
                <button
                  @click="toggleFullscreen"
                  class="btn btn-sm"
                  :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
                >
                  <component
                    :is="isFullscreen ? Minimize2 : Maximize2"
                    class="w-4 h-4"
                  />
                </button>
                <button
                  v-if="userRole === 'Manager' && isManagerSessionActive"
                  @click="handleManagerLogout"
                  class="btn btn-sm btn-outline btn-error"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main POS Interface -->
      <div class="flex-1 flex flex-row overflow-hidden max-h-[90vh]">
        <!-- Left Side - Menu -->
        <div class="flex-1 flex flex-col bg-white">
          <!-- Category Navigation -->
          <div class="bg-primaryColor px-6 py-3">
            <div class="flex space-x-2 overflow-x-auto scrollbar-hide">
              <button
                v-for="category in posStore.categories"
                :key="category"
                @click="posStore.setSelectedCategory(category)"
                class="btn btn-sm px-4 py-2 rounded-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                :class="
                  posStore.selectedCategory === category
                    ? 'bg-white/10 backdrop-blur-sm text-white'
                    : 'btn-ghost text-white hover:bg-primaryColor/80'
                "
              >
                {{ category }}
              </button>
            </div>
          </div>

          <!-- Menu Items Grid -->
          <div class="flex-1 p-6 overflow-y-auto max-h-[90vh]">
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              <div
                v-for="item in posStore.filteredMenuItems"
                :key="item.id"
                class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col p-4 relative"
                :class="{
                  'opacity-60 border-red-300 bg-red-50': item.is_expired,
                  'border-orange-300 bg-orange-50':
                    item.is_expiring_soon && !item.is_expired,
                  'border-green-300 !bg-green-50':
                    !item.is_expired &&
                    !item.is_expiring_soon &&
                    item.promo_info &&
                    item.promo_info.is_active,
                  'border-yellow-300 bg-yellow-50':
                    !item.is_expired &&
                    !item.is_expiring_soon &&
                    (!item.promo_info || !item.promo_info.is_active) &&
                    parseFloat(item.stock_quantity || 0) > 0 &&
                    parseFloat(item.stock_quantity || 0) <= 10,
                  'cursor-not-allowed': item.is_expired,
                }"
                @click="
                  item.stock_quantity > 0 &&
                  !item.is_expired &&
                  handleAddToOrder(item)
                "
              >
                <!-- Item Image (Top) -->
                <div
                  class="w-full bg-gray-100 aspect-square rounded-md overflow-hidden"
                >
                  <img
                    v-if="item.image_url"
                    :src="item.image_url"
                    :alt="item.name"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-gray-400"
                  >
                    <Package class="w-8 h-8 sm:w-12 sm:h-12" />
                  </div>
                </div>

                <!-- Expired Overlay -->
                <div
                  v-if="item.is_expired"
                  class="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10"
                >
                  <div
                    class="bg-red-500 text-white px-3 md:px-4 py-1 md:py-2 rounded-full text-sm md:text-base font-bold"
                  >
                    EXPIRED
                  </div>
                </div>

                <!-- Expiring Soon Warning -->
                <div
                  v-if="item.is_expiring_soon && !item.is_expired"
                  class="absolute top-2 md:top-3 right-2 md:right-3 z-10"
                >
                  <div
                    class="bg-orange-500 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold"
                  >
                    EXPIRES SOON
                  </div>
                </div>

                <!-- Promo Warning -->
                <div
                  v-if="
                    !item.is_expired &&
                    !item.is_expiring_soon &&
                    item.promo_info &&
                    item.promo_info.is_active
                  "
                  class="absolute top-2 md:top-3 right-2 md:right-3 z-10"
                >
                  <div
                    class="bg-success text-white px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold"
                  >
                    PROMO
                  </div>
                </div>

                <!-- Low Stock Warning -->
                <div
                  v-if="
                    !item.is_expired &&
                    !item.is_expiring_soon &&
                    (!item.promo_info || !item.promo_info.is_active) &&
                    parseFloat(item.stock_quantity || 0) > 0 &&
                    parseFloat(item.stock_quantity || 0) <= 10
                  "
                  class="absolute top-2 md:top-3 right-2 md:right-3 z-10"
                >
                  <div
                    class="bg-yellow-500 text-white px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold"
                  >
                    LOW STOCK
                  </div>
                </div>
                <!-- Item Details (Bottom) -->
                <div class="flex-1 w-full pt-3 flex flex-col">
                  <div class="flex items-center justify-between gap-2">
                    <h2
                      class="font-semibold text-gray-900 text-sm md:text-base truncate flex-1 min-w-0"
                    >
                      {{ item.name }}
                    </h2>
                    <!-- Stock Badge -->
                    <span
                      class="badge badge-sm md:badge-md border-none text-xs md:text-sm font-medium whitespace-nowrap"
                      :class="
                        item.is_expired
                          ? 'bg-red-500/20 text-red-600'
                          : parseFloat(item.stock_quantity || 0) === 0
                            ? 'bg-error/20 text-error'
                            : parseFloat(item.stock_quantity || 0) <= 10
                              ? 'bg-warning/20 text-warning'
                              : 'bg-success/20 text-success'
                      "
                    >
                      {{
                        item.is_expired
                          ? 'EXPIRED'
                          : item.is_expiring_soon
                            ? 'EXPIRES SOON'
                            : parseFloat(item.stock_quantity || 0) === 0
                              ? 'OUT OF STOCK'
                              : parseFloat(item.stock_quantity || 0) <= 10
                                ? `LOW STOCK: ${item.stock_quantity}`
                                : `Stock: ${item.stock_quantity}`
                      }}
                    </span>
                  </div>

                  <!-- Price Button -->
                  <button
                    @click.stop="handleAddToOrder(item)"
                    :disabled="item.stock_quantity <= 0 || item.is_expired"
                    class="btn btn-sm w-full font-medium mt-3"
                    :class="
                      item.is_expired
                        ? 'btn-disabled bg-red-100 text-red-500'
                        : item.stock_quantity > 0
                          ? 'bg-primaryColor text-white'
                          : 'btn-disabled'
                    "
                  >
                    <template v-if="item.is_expired">EXPIRED</template>
                    <template v-else-if="item.stock_quantity <= 0"
                      >Out of Stock</template
                    >
                    <template v-else>
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{
                        (item.promo_info &&
                        item.promo_info.is_active &&
                        item.promo_info.discount_type
                          ? calculateMenuDiscountedPrice(item)
                          : parseFloat(item.price || 0)
                        ).toFixed(2)
                      }}
                    </template>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Order Summary -->
        <div
          class="w-96 bg-white border-l border-gray-200 flex flex-col max-h-[90vh]"
        >
          <!-- Order Header -->
          <div class="bg-primaryColor text-white px-4 py-4">
            <h2 class="text-md font-semibold">
              Order Number {{ posStore.getNextOrderNumber() }}
            </h2>
          </div>

          <!-- Order Items -->
          <div
            class="flex-1 p-6 overflow-y-auto"
            :class="{
              'flex items-center justify-center':
                posStore.currentOrder.items.length === 0,
            }"
          >
            <div
              v-if="posStore.currentOrder.items.length === 0"
              class="text-center text-gray-500"
            >
              <ShoppingCart class="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No items in order</p>
            </div>

            <div v-else class="space-y-4 w-full">
              <div
                v-for="item in posStore.currentOrder.items"
                :key="item.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-sm"
              >
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-gray-900 truncate">
                    {{ item.name }}
                    <!-- Promo Badge -->
                    <span
                      v-if="
                        item.promo_info &&
                        item.promo_info.is_active &&
                        item.quantity >= item.promo_info.minimum_quantity
                      "
                      class="badge badge-xs bg-warning/20 text-warning ml-2"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-star"
                        class="w-2 h-2 mr-1"
                      />
                      PROMO
                    </span>
                  </h4>
                  <div class="text-sm text-gray-600">
                    <!-- Original Price -->
                    <span class="text-gray-500">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(item.price || 0).toFixed(2) }}
                    </span>
                    <!-- Show discounted price if promo applies -->
                    <span
                      v-if="
                        item.promo_info &&
                        item.promo_info.is_active &&
                        item.quantity >= item.promo_info.minimum_quantity
                      "
                      class="text-success ml-2"
                    >
                      →
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ calculateDiscountedPrice(item).toFixed(2) }}
                      <span class="text-xs text-warning ml-1">
                        (Save ₱{{
                          (
                            parseFloat(item.price) -
                            calculateDiscountedPrice(item)
                          ).toFixed(2)
                        }})
                      </span>
                    </span>
                  </div>
                  <!-- Promo Description -->
                  <p
                    v-if="
                      item.promo_info &&
                      item.promo_info.is_active &&
                      item.promo_info.description
                    "
                    class="text-xs text-warning mt-1"
                  >
                    {{ item.promo_info.description }}
                  </p>
                </div>

                <!-- Quantity Controls -->
                <div class="flex items-center space-x-2 flex-shrink-0">
                  <button
                    @click="handleUpdateQuantity(item.id, item.quantity - 1)"
                    class="btn btn-xs btn-circle bg-error text-white"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <span class="w-8 text-center font-medium">
                    {{ item.quantity }}
                  </span>
                  <button
                    @click="handleUpdateQuantity(item.id, item.quantity + 1)"
                    class="btn btn-xs btn-circle bg-primaryColor text-white"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Total -->
          <div class="p-6 border-t border-gray-200">
            <div class="space-y-3">
              <div class="flex justify-between text-lg font-semibold">
                <span>Total Cost:</span>
                <span
                  ><font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    posStore.orderTotal.toFixed(2)
                  }}</span
                >
              </div>

              <!-- Process Order Button -->
              <button
                @click="processOrder"
                :disabled="
                  posStore.currentOrder.items.length === 0 || isProcessingOrder
                "
                class="btn w-full btn-md touch-manipulation border-none shadow-none"
                :class="
                  posStore.currentOrder.items.length > 0
                    ? 'bg-primaryColor hover:bg-primaryColor/80 active:bg-primaryColor/90 text-white font-thin'
                    : 'bg-gray-400'
                "
              >
                <span class="hidden sm:inline">{{
                  isProcessingOrder ? 'Processing...' : 'Process Order'
                }}</span>
                <span class="sm:hidden">{{
                  isProcessingOrder ? '...' : 'Process'
                }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Confirmation Modal -->
      <div
        v-if="showOrderConfirmationModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div class="text-center mb-6">
            <AlertCircle
              class="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 mx-auto mb-3 sm:mb-4"
            />
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Confirm Order
            </h3>
            <p class="text-sm sm:text-base text-gray-600">
              Please review the order details before finalizing the transaction
            </p>
          </div>

          <!-- Order Details -->
          <div class="space-y-4 mb-6">
            <!-- Order Info -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium text-gray-600">Order Number:</span>
                  <p class="font-semibold">
                    {{ orderConfirmationData?.orderNumber }}
                  </p>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Order Type:</span>
                  <div class="flex space-x-2 mt-1">
                    <button
                      @click="confirmationOrderType = 'Dine In'"
                      class="px-3 py-1 rounded-sm text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                      :class="
                        confirmationOrderType === 'Dine In'
                          ? 'bg-primaryColor text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      "
                    >
                      Dine In
                    </button>
                    <button
                      @click="confirmationOrderType = 'Take Out'"
                      class="px-3 py-1 rounded-sm text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                      :class="
                        confirmationOrderType === 'Take Out'
                          ? 'bg-primaryColor text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      "
                    >
                      Take Out
                    </button>
                  </div>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Date & Time:</span>
                  <p class="font-semibold">
                    {{ orderConfirmationData?.timestamp }}
                  </p>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Cashier:</span>
                  <p class="font-semibold">
                    {{ orderConfirmationData?.cashierInfo?.name || 'N/A' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Order Items -->
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 class="font-semibold text-gray-900 mb-3">Order Items</h4>
              <div class="space-y-2">
                <div
                  v-for="item in orderConfirmationData?.items"
                  :key="item.id"
                  class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <p class="font-medium text-gray-900">{{ item.name }}</p>
                      <!-- Promo Badge -->
                      <span
                        v-if="
                          item.promo_info &&
                          item.promo_info.is_active &&
                          item.quantity >= item.promo_info.minimum_quantity
                        "
                        class="badge badge-xs bg-warning/20 text-warning"
                      >
                        <font-awesome-icon
                          icon="fa-solid fa-star"
                          class="w-2 h-2 mr-1"
                        />
                        PROMO
                      </span>
                    </div>
                    <div class="text-sm text-gray-600">
                      <!-- Original Price -->
                      <span class="text-gray-500">
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />
                        {{ parseFloat(item.price || 0).toFixed(2) }}
                      </span>
                      <!-- Discounted Price if promo applies -->
                      <span
                        v-if="
                          item.promo_info &&
                          item.promo_info.is_active &&
                          item.quantity >= item.promo_info.minimum_quantity
                        "
                        class="text-success ml-2"
                      >
                        →
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />
                        {{ calculateDiscountedPrice(item).toFixed(2) }}
                        <span class="text-xs text-warning ml-1">
                          (Save ₱{{
                            (
                              parseFloat(item.price) -
                              calculateDiscountedPrice(item)
                            ).toFixed(2)
                          }})
                        </span>
                      </span>
                      <span class="ml-1">× {{ item.quantity }}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-gray-900">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{
                        (
                          calculateDiscountedPrice(item) * item.quantity
                        ).toFixed(2)
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Summary -->
            <div class="bg-accentColor rounded-lg p-4">
              <div class="space-y-4">
                <!-- PH SC/PWD Discount Section -->
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700"
                    >Senior/PWD Discount</label
                  >
                  <div class="flex flex-wrap gap-2 items-center">
                    <button
                      class="btn btn-xs"
                      :class="
                        posStore.discountType === 'NONE' ? 'btn-active' : ''
                      "
                      @click="posStore.discountType = 'NONE'"
                    >
                      None
                    </button>
                    <button
                      class="btn btn-xs"
                      :class="
                        posStore.discountType === 'SC' ? 'btn-active' : ''
                      "
                      @click="posStore.discountType = 'SC'"
                    >
                      Senior Citizen
                    </button>
                    <button
                      class="btn btn-xs"
                      :class="
                        posStore.discountType === 'PWD' ? 'btn-active' : ''
                      "
                      @click="posStore.discountType = 'PWD'"
                    >
                      PWD
                    </button>
                    <span
                      v-if="posStore.discountType !== 'NONE'"
                      class="text-xs text-amber-600"
                    >
                      Promo and SC/PWD cannot be combined; regular prices will
                      be used.
                    </span>
                  </div>
                </div>

                <div
                  v-if="posStore.discountType !== 'NONE'"
                  class="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div>
                    <label class="text-xs text-gray-600"
                      >Beneficiary Name</label
                    >
                    <input
                      v-model="posStore.beneficiaryName"
                      type="text"
                      placeholder="Full name"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-gray-600">ID Number</label>
                    <input
                      v-model="posStore.beneficiaryIdNo"
                      type="text"
                      placeholder="SC/PWD ID No."
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">
                    {{
                      confirmIsVatExempt
                        ? 'Beneficiary Meal (VAT-Exempt Base):'
                        : 'Subtotal:'
                    }}
                  </span>
                  <span class="font-semibold">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{
                      confirmIsVatExempt
                        ? confirmVatExemptItemBase.toFixed(2)
                        : confirmGross.toFixed(2)
                    }}
                  </span>
                </div>
                <div
                  v-if="confirmIsVatExempt"
                  class="flex justify-between text-sm"
                >
                  <span class="text-gray-600">SC/PWD Discount (20%):</span>
                  <span class="font-semibold text-emerald-700">
                    -<font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ confirmDiscountAmount.toFixed(2) }}
                  </span>
                </div>
                <div
                  v-if="confirmIsVatExempt"
                  class="flex justify-between text-xs text-gray-500"
                >
                  <span>Removed VAT on beneficiary meal:</span>
                  <span>
                    -<font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ confirmRemovedVatOnItem.toFixed(2) }}
                  </span>
                </div>
                <div
                  class="flex justify-between text-sm border-t border-gray-200 pt-2"
                >
                  <span class="text-gray-800 font-medium">Amount Due:</span>
                  <span class="font-semibold">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ confirmTotalDue.toFixed(2) }}
                  </span>
                </div>

                <!-- Amount Paid Input -->
                <div class="space-y-2">
                  <label class="text-sm font-medium text-gray-700">
                    Amount to Pay:
                  </label>
                  <input
                    v-model.number="paymentInput"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent text-sm"
                    @input="handlePaymentInput($event.target.value)"
                  />
                </div>

                <div
                  class="flex justify-between text-sm font-semibold text-primaryColor border-t border-gray-200 pt-2"
                >
                  <span>Change:</span>
                  <span>
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ confirmChange.toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
          >
            <button
              @click="closeOrderConfirmationModal"
              class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
            >
              Cancel
            </button>
            <button
              @click="confirmOrder"
              :disabled="
                isProcessingOrder ||
                (parseFloat(paymentInput) || 0) < confirmTotalDue ||
                (posStore.discountType !== 'NONE' &&
                  (!posStore.beneficiaryName || !posStore.beneficiaryIdNo))
              "
              class="flex-1 btn btn-sm sm:btn-md touch-manipulation font-thin"
              :class="
                isProcessingOrder ||
                (parseFloat(paymentInput) || 0) < confirmTotalDue ||
                (posStore.discountType !== 'NONE' &&
                  (!posStore.beneficiaryName || !posStore.beneficiaryIdNo))
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-primaryColor text-white hover:bg-primaryColor/80'
              "
            >
              <span v-if="isProcessingOrder">Processing...</span>
              <span
                v-else-if="(parseFloat(paymentInput) || 0) < confirmTotalDue"
              >
                Enter Payment Amount
              </span>
              <span
                v-else-if="
                  posStore.discountType !== 'NONE' &&
                  (!posStore.beneficiaryName || !posStore.beneficiaryIdNo)
                "
              >
                Enter Beneficiary Details
              </span>
              <span v-else>Confirm & Finalize Order</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Order Complete Modal -->
      <div
        v-if="showOrderCompleteModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <div class="text-center">
            <CheckCircle
              class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor mx-auto mb-3 sm:mb-4"
            />
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Order Complete!
            </h3>
            <p class="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Order {{ orderCompleteData?.order_number }} has been processed
              successfully.
            </p>

            <div class="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <div class="flex justify-between text-xs sm:text-sm">
                <span>Total:</span>
                <span class="font-semibold"
                  ><font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    parseFloat(orderCompleteData?.total_amount || 0).toFixed(2)
                  }}</span
                >
              </div>
              <div class="flex justify-between text-xs sm:text-sm">
                <span>Amount Paid:</span>
                <span class="font-semibold"
                  ><font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    parseFloat(orderCompleteData?.amount_paid || 0).toFixed(2)
                  }}</span
                >
              </div>
              <div
                class="flex justify-between text-xs sm:text-sm font-semibold text-primaryColor"
              >
                <span>Change:</span>
                <span>
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    parseFloat(orderCompleteData?.change_amount || 0).toFixed(2)
                  }}</span
                >
              </div>
            </div>

            <div
              class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
            >
              <button
                @click="closeOrderCompleteModal"
                class="flex-1 btn btn-sm sm:btn-md touch-manipulation font-thin hover:bg-gray-50"
              >
                New Order
              </button>
              <button
                @click="showReceipt"
                class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Receipt Modal -->
      <div
        v-if="showReceiptModal"
        id="pos_receipt_modal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <div id="print-area">
            <!-- Receipt Header -->
            <div class="text-center mb-6">
              <h2 class="text-2xl font-bold text-gray-900 mb-2">
                Countryside Steak House
              </h2>
              <p class="text-sm text-gray-600 mb-1">
                {{ receiptData?.branchName }}
              </p>
              <p class="text-xs text-gray-500 mb-4">
                {{ receiptData?.branchLocation }}
              </p>
              <div class="border-t border-gray-300 pt-2">
                <p class="text-xs text-gray-600">
                  {{ receiptData?.timestamp }}
                </p>
              </div>
            </div>

            <!-- Order Details -->
            <div class="space-y-4 mb-6">
              <!-- Order Info -->
              <div class="text-sm">
                <div class="flex justify-between mb-2">
                  <span class="font-medium">Order #:</span>
                  <span>{{ receiptData?.order_number }}</span>
                </div>
                <div class="flex justify-between mb-2">
                  <span class="font-medium">Type:</span>
                  <span>{{ receiptData?.orderType }}</span>
                </div>
                <div class="flex justify-between mb-2">
                  <span class="font-medium">Cashier:</span>
                  <span>{{ receiptData?.cashierName }}</span>
                </div>
                <div
                  v-if="
                    receiptData?.discountType &&
                    receiptData.discountType !== 'NONE'
                  "
                  class="mt-2 p-2 rounded bg-emerald-50 text-emerald-700 text-xs"
                >
                  VAT Exempt (SC/PWD). Beneficiary:
                  {{ receiptData?.beneficiaryName }} — ID:
                  {{ receiptData?.beneficiaryIdNo }}
                </div>
              </div>

              <!-- Order Items -->
              <div class="border-t border-gray-300 pt-4">
                <div class="space-y-2">
                  <div
                    v-for="item in receiptData?.items"
                    :key="item.id"
                    class="flex justify-between text-sm"
                  >
                    <div class="flex flex- row gap-3">
                      <p class="font-medium">{{ item.item_name }}</p>
                      <p class="text-gray-600">
                        {{ item.quantity }}
                        <font-awesome-icon
                          icon="fa-solid fa-xmark"
                          class="!w-3 !h-3"
                        />
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="font-semibold">
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />
                        {{ parseFloat(item.total_price || 0).toFixed(2) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Payment Summary -->
              <div class="border-t border-gray-300 pt-4">
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span>Subtotal:</span>
                    <span>
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{
                        parseFloat(receiptData?.subtotalBeforeVat || 0).toFixed(
                          2
                        )
                      }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span
                      >Tax ({{
                        (receiptData?.vatRate * 100 || 0).toFixed(0)
                      }}%):</span
                    >
                    <span>
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(receiptData?.vatAmount || 0).toFixed(2) }}
                    </span>
                  </div>
                  <div
                    class="flex justify-between font-semibold border-t border-gray-300 pt-1"
                  >
                    <span>Total Amount:</span>
                    <span>
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{
                        parseFloat(receiptData?.total_amount || 0).toFixed(2)
                      }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(receiptData?.amount_paid || 0).toFixed(2) }}
                    </span>
                  </div>
                  <div
                    class="flex justify-between font-semibold text-primaryColor border-t border-gray-300 pt-2"
                  >
                    <span>Change:</span>
                    <span>
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{
                        parseFloat(receiptData?.change_amount || 0).toFixed(2)
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- QR Code -->
              <div class="border-t border-gray-300 pt-3 text-center">
                <p class="text-xs text-gray-500">
                  Tell us about your visit. Scan the QR code below and share
                  your experience!
                </p>
                <div class="mb-2 flex justify-center">
                  <div class="w-32 h-32 flex items-center justify-center">
                    <QRCodeGenerator
                      :data="receiptData?.qrData"
                      :size="120"
                      class="max-w-full max-h-full"
                    />
                  </div>
                </div>
                <p class="text-xs text-gray-500">
                  Thank you, please come again!
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
          >
            <button
              @click="closeReceiptModal"
              class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
            >
              Close
            </button>
            <button
              @click="printReceipt"
              class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>

      <!-- Void Order Modal -->
      <div
        v-if="showVoidOrderModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <div class="text-center mb-6">
            <AlertCircle
              class="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-3 sm:mb-4"
            />
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Void Order
            </h3>
            <p class="text-sm sm:text-base text-gray-600">
              Are you sure you want to void this order? This action cannot be
              undone.
            </p>
          </div>

          <!-- Order Details -->
          <div class="space-y-4 mb-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium text-gray-600">Order Number:</span>
                  <p class="font-semibold">{{ voidOrderData?.order_number }}</p>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Total Amount:</span>
                  <p class="font-semibold">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{
                      parseFloat(voidOrderData?.total_amount || 0).toFixed(2)
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Void Reason -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                Reason for voiding:
              </label>
              <textarea
                v-model="voidReason"
                placeholder="Enter reason for voiding this order..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                rows="3"
                required
              ></textarea>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
          >
            <button
              @click="closeVoidOrderModal"
              class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
            >
              Cancel
            </button>
            <button
              @click="confirmVoidOrder"
              class="flex-1 btn bg-red-600 text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-red-700"
            >
              Void Order
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Close POS Interface div -->

    <!-- Item Confirmation Modal -->
    <div
      v-if="showItemConfirmationModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div class="text-center mb-6">
          <Package
            class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor mx-auto mb-3 sm:mb-4"
          />
          <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Add to Order
          </h3>
          <p class="text-sm sm:text-base text-gray-600">
            Confirm the quantity for this item
          </p>
        </div>

        <!-- Item Details -->
        <div class="space-y-4 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center space-x-4">
              <!-- Item Image -->
              <div class="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0">
                <img
                  v-if="selectedMenuItem?.image_url"
                  :src="selectedMenuItem.image_url"
                  :alt="selectedMenuItem.name"
                  class="w-full h-full object-cover rounded-lg"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-gray-400"
                >
                  <Package class="w-8 h-8" />
                </div>
              </div>

              <!-- Item Info -->
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-gray-900 text-lg">
                  {{ selectedMenuItem?.name }}
                </h4>
                <p class="text-sm text-gray-600 mb-1">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ parseFloat(selectedMenuItem?.price || 0).toFixed(2) }}
                </p>
                <p class="text-xs text-gray-500">
                  Stock: {{ selectedMenuItem?.stock_quantity || 0 }}
                </p>
              </div>
            </div>
          </div>

          <!-- Quantity Selection -->
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-3">Quantity</h4>
            <div class="flex items-center justify-center space-x-4">
              <button
                @click="updateItemQuantity(-1)"
                :disabled="itemQuantity <= 1"
                class="btn btn-circle btn-sm bg-error text-white disabled:bg-gray-300"
              >
                <Minus class="w-4 h-4" />
              </button>

              <input
                v-model.number="itemQuantity"
                type="number"
                min="1"
                :max="selectedMenuItem?.stock_quantity || 999"
                class="w-20 text-center text-lg font-semibold border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                @input="validateQuantity"
              />

              <button
                @click="updateItemQuantity(1)"
                :disabled="
                  itemQuantity >= (selectedMenuItem?.stock_quantity || 999)
                "
                class="btn btn-circle btn-sm bg-primaryColor text-white disabled:bg-gray-300"
              >
                <Plus class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-gray-500 text-center mt-2">
              Available: {{ selectedMenuItem?.stock_quantity || 0 }}
            </p>
          </div>

          <!-- Total Price -->
          <div class="bg-primaryColor/10 rounded-lg p-4">
            <div class="flex justify-between items-center">
              <span class="font-semibold text-gray-900">Total:</span>
              <span class="text-xl font-bold text-primaryColor">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />
                {{ ((selectedMenuItem?.price || 0) * itemQuantity).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
        >
          <button
            @click="closeItemConfirmationModal"
            class="flex-1 btn bg-gray-200 hover:bg-gray-300 btn-sm sm:btn-md touch-manipulation font-thin"
          >
            Cancel
          </button>
          <button
            @click="confirmAddToOrder"
            class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>

    <!-- POS Transaction Modal -->
    <POSTransactionModal
      :show="showTransactionModal"
      @close="closeTransactionModal"
      @reopen="reopenTransactionModal"
      @refresh="refreshPOSData"
    />

    <!-- Branch Status Confirmation Modal -->
    <div
      v-if="showStatusConfirmationModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div class="text-center mb-6">
          <AlertCircle
            class="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 mx-auto mb-3 sm:mb-4"
          />
          <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Confirm Branch Status Change
          </h3>
          <p class="text-sm sm:text-base text-gray-600">
            Are you sure you want to change the branch status from
            <strong>{{ branchStatus }}</strong> to
            <strong>{{ pendingStatusChange }}</strong
            >?
          </p>
        </div>

        <!-- Branch Details -->
        <div class="space-y-4 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-600">Branch:</span>
                <p class="font-semibold">
                  {{ currentBranch?.name || 'N/A' }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Current Status:</span>
                <p
                  class="font-semibold"
                  :class="
                    branchStatus === 'Open' ? 'text-green-600' : 'text-red-600'
                  "
                >
                  {{ branchStatus }}
                </p>
              </div>
              <div class="col-span-2">
                <span class="font-medium text-gray-600">New Status:</span>
                <p
                  class="font-semibold"
                  :class="
                    pendingStatusChange === 'Open'
                      ? 'text-green-600'
                      : 'text-red-600'
                  "
                >
                  {{ pendingStatusChange }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
        >
          <button
            @click="closeStatusConfirmationModal"
            class="flex-1 btn btn-sm sm:btn-md touch-manipulation font-thin"
            :disabled="isUpdatingStatus"
          >
            Cancel
          </button>
          <button
            @click="confirmStatusChange"
            class="flex-1 btn btn-sm sm:btn-md touch-manipulation font-thin"
            :class="
              pendingStatusChange === 'Open'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            "
            :disabled="isUpdatingStatus"
          >
            <span v-if="isUpdatingStatus">Updating...</span>
            <span v-else>Confirm Change</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Hide scrollbar for category navigation */
  .scrollbar-hide {
    -ms-overflow-style: none; /* Internet Explorer 10+ */
    scrollbar-width: none; /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }

  /* Line clamp utility for text truncation */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Touch-friendly button styles */
  .touch-manipulation {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Responsive grid adjustments */
  /*
    Removed custom overrides for Tailwind's grid-cols utilities that caused
    tablet/responsive issues. Use Tailwind responsive classes in markup instead.
  */

  /* Mobile-specific adjustments */
  @media (max-width: 768px) {
    .min-h-screen {
      min-height: 100vh;
      min-height: 100dvh; /* Dynamic viewport height for mobile */
    }
  }

  /* Landscape mobile adjustments */
  @media (max-width: 768px) and (orientation: landscape) {
    .max-h-96 {
      max-height: 50vh;
    }
  }

  /* Print styles for receipt */
  @media print {
    .fixed {
      position: static !important;
    }

    .bg-black\/50,
    .backdrop-blur-sm {
      background: transparent !important;
      backdrop-filter: none !important;
    }

    .rounded-lg {
      border-radius: 0 !important;
    }

    .shadow-lg,
    .shadow-sm {
      box-shadow: none !important;
    }

    .max-w-md {
      max-width: none !important;
    }

    .max-h-\[90vh\] {
      max-height: none !important;
    }

    .overflow-y-auto {
      overflow: visible !important;
    }

    /* Hide action buttons in print */
    .flex.flex-col.sm\:flex-row.space-y-2 {
      display: none !important;
    }
  }
</style>
