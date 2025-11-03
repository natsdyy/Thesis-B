<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import Editor from '@tinymce/tinymce-vue';
  import tinymce from 'tinymce/tinymce';
  import 'tinymce/icons/default';
  import 'tinymce/themes/silver';
  import 'tinymce/models/dom/model';
  import 'tinymce/plugins/link';
  import 'tinymce/plugins/lists';
  import 'tinymce/plugins/image';
  import 'tinymce/plugins/table';
  import 'tinymce/plugins/code';
  import 'tinymce/skins/ui/oxide/skin.min.css';
  import {
    FileText,
    Search,
    Filter,
    RefreshCcw,
    Eye,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Clock,
    User,
    Package,
    DollarSign,
    PhilippinePeso,
    EllipsisVertical,
  } from 'lucide-vue-next';
  import { usePurchaseOrderStore } from '../../stores/purchaseOrderStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { formatImageUrl, getApiUrl } from '../../config/api.js';

  // Props
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    purchaseOrderId: {
      type: [Number, String],
      default: null,
    },
    onClose: {
      type: Function,
      required: true,
    },
  });

  // Emits - Add the missing viewReturnDetails event
  const emit = defineEmits([
    'return-processed',
    'return-cancelled',
    'viewReturnDetails',
    'return-sent-to-supplier',
  ]);

  // Store
  const purchaseOrderStore = usePurchaseOrderStore();
  const authStore = useAuthStore();

  const currentEmployeeName = computed(() => {
    const u = authStore?.user || {};
    return (
      u.name ||
      `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
      u.email ||
      'Employee'
    );
  });

  try {
    tinymce?.EditorManager?.overrideDefaults?.({ license_key: 'gpl' });
  } catch (_) {}

  const tinyMCEConfig = {
    menubar: false,
    height: 220,
    branding: false,
    statusbar: false,
    plugins: 'link lists image table code paste',
    toolbar:
      'undo redo | bold italic underline | bullist numlist | link image table | uploadimage | removeformat',
    toolbar_mode: 'wrap',
    automatic_uploads: false,
    paste_data_images: true,
    file_picker_types: 'image',
    content_style:
      'html,body{max-width:100%;} img{max-width:100%;height:auto;display:block;margin:6px 0;}',
    images_upload_handler: async (blobInfo) => {
      return new Promise((resolve, reject) => {
        try {
          const token = localStorage.getItem('token');
          const formData = new FormData();
          formData.append('file', blobInfo.blob(), blobInfo.filename());
          fetch(getApiUrl('/uploads/proofs'), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
            .then((r) => r.json())
            .then((data) => {
              if (data?.location) {
                resolve(formatImageUrl(data.location));
              } else {
                reject(data?.message || 'Upload failed');
              }
            })
            .catch((e) => reject(e?.message || 'Upload failed'));
        } catch (e) {
          reject(e?.message || 'Upload failed');
        }
      });
    },
    setup: (ed) => {
      ed.ui.registry.addButton('uploadimage', {
        text: 'Upload Image',
        tooltip: 'Upload image',
        onAction: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/png,image/jpeg';
          input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            try {
              const token = localStorage.getItem('token');
              const fd = new FormData();
              fd.append('file', file);
              const res = await fetch(getApiUrl('/uploads/proofs'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
              });
              const json = await res.json();
              if (res.ok && json.location) {
                ed.insertContent(
                  `<img src="${formatImageUrl(json.location)}" />`
                );
              } else {
                alert(json.message || 'Upload failed');
              }
            } catch (_) {
              alert('Upload failed');
            }
          };
          input.click();
        },
      });
    },
    license_key: 'gpl',
  };

  // Local state
  const loading = ref(false);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const reasonFilter = ref('');
  const dateFilterType = ref('month'); // Changed from 'today' to 'all' to show all returns by default
  const currentPage = ref(1);
  const itemsPerPage = ref(10);

  // Custom month picker state
  const showCustomMonthPicker = ref(false);
  const customMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Confirmation modal state/helpers
  const confirmDialog = ref({
    show: false,
    title: 'Please Confirm',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    _resolver: null,
  });

  const askConfirm = (message, options = {}) => {
    return new Promise((resolve) => {
      confirmDialog.value = {
        show: true,
        title: options.title || 'Please Confirm',
        message,
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        _resolver: resolve,
      };
      // Open native <dialog> programmatically in case it's not open via :open binding
      setTimeout(() => {
        document.getElementById('po_confirm_modal')?.showModal?.();
      }, 0);
    });
  };

  const confirmYes = () => {
    confirmDialog.value.show = false;
    document.getElementById('po_confirm_modal')?.close?.();
    confirmDialog.value._resolver?.(true);
  };

  const confirmNo = () => {
    confirmDialog.value.show = false;
    document.getElementById('po_confirm_modal')?.close?.();
    confirmDialog.value._resolver?.(false);
  };

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending:
        'badge badge-sm border-none font-medium bg-warning/20 text-warning',
      Processed: 'badge badge-sm border-none font-medium bg-info/20 text-info',
      Completed:
        'badge badge-sm border-none font-medium bg-success/20 text-success',
    };
    return (
      colors[status] ||
      'badge badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getReasonColor = (reason) => {
    const colors = {
      'Back Order': 'text-info',
      Defective: 'text-error',
      'Wrong Item': 'text-warning',
      'Poor Quality': 'text-error',
      'Damaged in Transit': 'text-error',
      Other: 'text-neutral',
    };
    return colors[reason] || 'text-neutral';
  };

  // Determine if a return has been marked as sent to supplier
  const isMarkedForSupplier = (returnItem) => {
    if (!returnItem) return false;
    if (returnItem.sent_to_supplier) return true; // backend support if present
    const text = String(returnItem.notes || '').toLowerCase();
    return text.includes('sent to supplier');
  };

  // Date helpers for filtration
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday first
    return new Date(d.setDate(diff));
  };

  const getStartOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);

  // Available years for custom month picker
  const availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  });

  // Quick date options with calculated counts
  const quickDateOptions = computed(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const toYMD = (date) =>
      date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    const options = [
      { label: 'All', date: null, count: 0 },
      { label: 'Today', date: toYMD(today), count: 0 },
      { label: 'This Week', date: null, count: 0 },
      { label: 'This Month', date: null, count: 0 },
    ];

    // Calculate counts based on actual return data
    const returns = itemReturns.value;
    options.forEach((option) => {
      if (option.label === 'All') {
        option.count = returns.length;
      } else if (option.label === 'Today') {
        option.count = returns.filter((returnItem) => {
          const returnDate = new Date(
            new Date(returnItem.created_at).toLocaleString('en-US', {
              timeZone: 'Asia/Manila',
            })
          );
          const normalized = returnDate.toLocaleDateString('en-CA', {
            timeZone: 'Asia/Manila',
          });
          return normalized === option.date;
        }).length;
      } else if (option.label === 'This Week') {
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = new Date(today);
        endOfWeek.setHours(23, 59, 59, 999);

        option.count = returns.filter((returnItem) => {
          const returnDate = new Date(returnItem.created_at);
          return returnDate >= startOfWeek && returnDate <= endOfWeek;
        }).length;
      } else if (option.label === 'This Month') {
        const startOfMonth = getStartOfMonth(today);
        const endOfMonth = new Date(today);
        endOfMonth.setHours(23, 59, 59, 999);

        option.count = returns.filter((returnItem) => {
          const returnDate = new Date(returnItem.created_at);
          return returnDate >= startOfMonth && returnDate <= endOfMonth;
        }).length;
      }
    });

    return options;
  });

  // Computed properties
  const itemReturns = computed(() => {
    let returns = purchaseOrderStore.itemReturns || [];
    console.log(
      '🔄 itemReturns computed - store data:',
      purchaseOrderStore.itemReturns
    );
    console.log('🔄 itemReturns computed - returns length:', returns.length);

    // Filter by purchase order if specified
    if (props.purchaseOrderId) {
      returns = returns.filter(
        (returnItem) => returnItem.purchase_order_id == props.purchaseOrderId
      );
      console.log(
        '🔄 itemReturns computed - filtered by PO:',
        props.purchaseOrderId,
        'result length:',
        returns.length
      );
    }

    return returns;
  });

  const filteredReturns = computed(() => {
    let filtered = [...(itemReturns.value || [])];
    console.log(
      '🔄 filteredReturns computed - starting with:',
      filtered.length,
      'items'
    );

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (returnItem) =>
          returnItem.item_name?.toLowerCase().includes(query) ||
          returnItem.return_reason?.toLowerCase().includes(query) ||
          returnItem.processed_by?.toLowerCase().includes(query) ||
          returnItem.logged_by?.toLowerCase().includes(query) ||
          returnItem.notes?.toLowerCase().includes(query)
      );
      console.log(
        '🔄 filteredReturns computed - after search filter:',
        filtered.length,
        'items'
      );
    }

    // Status filter
    if (statusFilter.value) {
      filtered = filtered.filter(
        (returnItem) => returnItem.status === statusFilter.value
      );
      console.log(
        '🔄 filteredReturns computed - after status filter:',
        filtered.length,
        'items'
      );
    }

    // Reason filter
    if (reasonFilter.value) {
      filtered = filtered.filter(
        (returnItem) => returnItem.return_reason === reasonFilter.value
      );
      console.log(
        '🔄 filteredReturns computed - after reason filter:',
        filtered.length,
        'items'
      );
    }

    // Date filter based on selected filter type
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilterType.value) {
      case 'all':
        // No specific date filtering, return all returns
        console.log(
          '🔄 filteredReturns computed - using ALL filter, no date filtering'
        );
        break;
      case 'today':
        filtered = filtered.filter((returnItem) => {
          const returnDate = new Date(returnItem.created_at);
          returnDate.setHours(0, 0, 0, 0);
          return returnDate.getTime() === today.getTime();
        });
        console.log(
          '🔄 filteredReturns computed - after today filter:',
          filtered.length,
          'items'
        );
        break;
      case 'week':
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = new Date(today);
        endOfWeek.setHours(23, 59, 59, 999);
        filtered = filtered.filter((returnItem) => {
          const returnDate = new Date(returnItem.created_at);
          return returnDate >= startOfWeek && returnDate <= endOfWeek;
        });
        console.log(
          '🔄 filteredReturns computed - after week filter:',
          filtered.length,
          'items'
        );
        break;
      case 'month':
        const startOfMonth = getStartOfMonth(today);
        const endOfMonth = new Date(today);
        endOfMonth.setHours(23, 59, 59, 999);
        filtered = filtered.filter((returnItem) => {
          const returnDate = new Date(returnItem.created_at);
          return returnDate >= startOfMonth && returnDate <= endOfMonth;
        });
        console.log(
          '🔄 filteredReturns computed - after month filter:',
          filtered.length,
          'items'
        );
        break;
      case 'custom_month':
        const startOfCustomMonth = new Date(
          customMonthPicker.value.year,
          customMonthPicker.value.month - 1,
          1
        );
        const endOfCustomMonth = new Date(
          customMonthPicker.value.year,
          customMonthPicker.value.month,
          0,
          23,
          59,
          59,
          999
        );
        filtered = filtered.filter((returnItem) => {
          const returnDate = new Date(returnItem.created_at);
          return (
            returnDate >= startOfCustomMonth && returnDate <= endOfCustomMonth
          );
        });
        console.log(
          '🔄 filteredReturns computed - after custom month filter:',
          filtered.length,
          'items'
        );
        break;
    }

    console.log(
      '🔄 filteredReturns computed - final result:',
      filtered.length,
      'items'
    );
    return filtered;
  });

  const paginatedReturns = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredReturns.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredReturns.value.length / itemsPerPage.value);
  });

  const uniqueReasons = computed(() => {
    const reasons = [
      ...new Set(itemReturns.value.map((item) => item.return_reason)),
    ];
    return reasons.filter(Boolean).sort();
  });

  const uniqueStatuses = computed(() => {
    const statuses = [...new Set(itemReturns.value.map((item) => item.status))];
    return statuses.filter(Boolean).sort();
  });

  // Statistics
  // Derive return value when backend field is missing or inaccurate.
  const getDerivedReturnValue = (returnItem) => {
    if (!returnItem) return 0;
    // Prefer computed value from related PO item pricing
    const po = purchaseOrderStore.purchaseOrders?.find?.(
      (p) => p.id == returnItem.purchase_order_id
    );
    const poItem = (po?.items || []).find(
      (it) => it.id == returnItem.purchase_order_item_id
    );
    const unitPrice = Number(
      poItem?.received_unit_price ??
        poItem?.unit_price ??
        returnItem.unit_price ??
        0
    );
    const qty = Number(returnItem.return_quantity || 0);
    const computedValue = qty * (isNaN(unitPrice) ? 0 : unitPrice);
    if (!isNaN(computedValue) && computedValue > 0) return computedValue;
    // Fallback to explicit value from backend when computation fails
    const explicit = Number(returnItem.return_value);
    return isNaN(explicit) ? 0 : explicit;
  };

  // Helper for template usage in receipt modal
  const computeReturnValue = (po, returnItem) => {
    if (!returnItem) return 0;
    const poItem = (po?.items || []).find(
      (it) => it.id == returnItem.purchase_order_item_id
    );
    const unitPrice = Number(
      poItem?.received_unit_price ??
        poItem?.unit_price ??
        returnItem.unit_price ??
        0
    );
    const qty = Number(returnItem.return_quantity || 0);
    const val = qty * (isNaN(unitPrice) ? 0 : unitPrice);
    if (!isNaN(val) && val > 0) return val;
    const explicit = Number(returnItem.return_value);
    return isNaN(explicit) ? 0 : explicit;
  };

  const returnStats = computed(() => {
    const returns = itemReturns.value || [];
    return {
      total: returns.length,
      pending: returns.filter((r) => r.status === 'Pending').length,
      completed: returns.filter((r) => r.status === 'Completed').length,
      totalValue: returns.reduce((sum, r) => sum + getDerivedReturnValue(r), 0),
    };
  });

  // Methods
  const loadItemReturns = async () => {
    loading.value = true;
    try {
      console.log('🔍 Starting loadItemReturns...');
      console.log('🔍 Props purchaseOrderId:', props.purchaseOrderId);
      console.log(
        '🔍 Store itemReturns before fetch:',
        purchaseOrderStore.itemReturns
      );

      await purchaseOrderStore.fetchItemReturns(props.purchaseOrderId);

      console.log(
        '🔍 Store itemReturns after fetch:',
        purchaseOrderStore.itemReturns
      );
      console.log(
        '🔍 Store itemReturns length:',
        purchaseOrderStore.itemReturns?.length
      );
      console.log('🔍 Current dateFilterType:', dateFilterType.value);
      console.log('🔍 Computed itemReturns.value:', itemReturns.value);
      console.log(
        '🔍 Computed itemReturns.value length:',
        itemReturns.value?.length
      );
      console.log('🔍 Computed filteredReturns.value:', filteredReturns.value);
      console.log(
        '🔍 Computed filteredReturns.value length:',
        filteredReturns.value?.length
      );
      console.log('🔍 Computed returnStats:', returnStats.value);
    } catch (error) {
      console.error('❌ Error loading item returns:', error);
      showToast('error', 'Failed to load return history');
    } finally {
      loading.value = false;
    }
  };

  // Date filter methods
  const selectQuickDate = (option) => {
    if (option.label === 'All') {
      dateFilterType.value = 'all';
    } else if (option.label === 'Today') {
      dateFilterType.value = 'today';
    } else if (option.label === 'This Week') {
      dateFilterType.value = 'week';
    } else if (option.label === 'This Month') {
      dateFilterType.value = 'month';
    }
    showCustomMonthPicker.value = false;
  };

  const handleDateFilterChange = () => {
    if (dateFilterType.value === 'custom') {
      showCustomMonthPicker.value = true;
    } else {
      showCustomMonthPicker.value = false;
    }
  };

  const toggleCustomMonthPicker = () => {
    showCustomMonthPicker.value = !showCustomMonthPicker.value;
  };

  const selectCustomMonth = () => {
    dateFilterType.value = 'custom_month';
    showCustomMonthPicker.value = false;
  };

  const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = '';
    reasonFilter.value = '';
    dateFilterType.value = 'all'; // Changed from 'today' to 'all' to show all returns by default
    currentPage.value = 1;
  };

  const viewReturnDetails = (returnItem) => {
    // Emit event to parent component to show detailed view
    emit('viewReturnDetails', returnItem);
  };

  const completeReturn = async (returnItem) => {
    if (!['Pending', 'Processed'].includes(returnItem.status)) {
      showToast('error', 'Only pending or processed returns can be completed');
      return;
    }

    // Enforce supplier sending before completion
    if (!isMarkedForSupplier(returnItem)) {
      showToast(
        'error',
        'Send this return to the supplier first before completing.'
      );
      return;
    }

    try {
      // Ensure processed_by is set to current employee before completing
      if (!returnItem.processed_by) {
        await purchaseOrderStore.updateItemReturn(returnItem.id, {
          processed_by: currentEmployeeName.value,
        });
      }
      await purchaseOrderStore.completeItemReturn(returnItem.id);
      showToast('success', 'Return completed successfully');
      emit('return-processed', returnItem);
    } catch (error) {
      showToast('error', error.message || 'Failed to complete return');
    }
  };

  const cancelReturn = async (returnItem) => {
    if (returnItem.status === 'Completed') {
      showToast('error', 'Completed returns cannot be cancelled');
      return;
    }

    try {
      await purchaseOrderStore.cancelItemReturn(returnItem.id);
      showToast('success', 'Return cancelled successfully');
      emit('return-cancelled', returnItem);
    } catch (error) {
      showToast('error', error.message || 'Failed to cancel return');
    }
  };

  // NEW: Send return to supplier
  const sendToSupplier = async (returnItem) => {
    if (!['Pending', 'Processed'].includes(returnItem.status)) {
      showToast(
        'error',
        'Only pending or processed returns can be sent to supplier'
      );
      return;
    }

    const confirmed = await askConfirm(
      `Send this return to the supplier?\n\nItem: ${returnItem.item_name}\nQuantity: ${returnItem.return_quantity}\n\nThe supplier will be notified to arrange pickup.`,
      { title: 'Send to Supplier', confirmText: 'Send', cancelText: 'Cancel' }
    );
    if (!confirmed) return;

    try {
      // Mark as Processed if currently Pending
      if (returnItem.status === 'Pending') {
        await purchaseOrderStore.processItemReturn(returnItem.id);
      }

      // Add note and set processed_by to the current employee
      await purchaseOrderStore.updateItemReturn(returnItem.id, {
        notes:
          (returnItem.notes || '') +
          '\n[Sent to Supplier for pickup/processing]',
        sent_to_supplier: true,
        processed_by: currentEmployeeName.value,
      });

      showToast('success', 'Return marked for supplier pickup');
      emit('return-sent-to-supplier', returnItem);
      await loadItemReturns();
    } catch (error) {
      showToast('error', error.message || 'Failed to send return to supplier');
    }
  };

  // NEW: Return receipt modal state
  const returnReceiptModal = ref({
    show: false,
    item: null,
    po: null,
  });

  // NEW: Open receipt (completed returns only)
  const openReturnReceipt = async (returnItem) => {
    if (returnItem.status !== 'Completed') {
      showToast('error', 'Receipt is available only for completed returns');
      return;
    }
    try {
      loading.value = true;
      // fetch PO for supplier/po_number context on receipt
      const po = await purchaseOrderStore.fetchPurchaseOrderById(
        returnItem.purchase_order_id
      );
      returnReceiptModal.value = {
        show: true,
        item: returnItem,
        po,
      };
      document.getElementById('return_receipt_modal').showModal();
    } catch (err) {
      console.error('Failed to load PO for return receipt', err);
      showToast('error', 'Failed to load receipt data');
    } finally {
      loading.value = false;
    }
  };

  const closeReturnReceipt = () => {
    document.getElementById('return_receipt_modal')?.close();
    returnReceiptModal.value = { show: false, item: null, po: null };
  };

  const printReturnReceipt = () => {
    window.print();
  };

  // Notes/Proof editor modal state
  const notesEditor = ref({ show: false, item: null, content: '' });

  const openNotesEditor = (returnItem) => {
    notesEditor.value = {
      show: true,
      item: returnItem,
      content: returnItem?.notes || '',
    };
    setTimeout(
      () => document.getElementById('po_notes_editor_modal')?.showModal?.(),
      0
    );
  };

  const closeNotesEditor = () => {
    document.getElementById('po_notes_editor_modal')?.close?.();
    notesEditor.value = { show: false, item: null, content: '' };
  };

  const saveNotesEditor = async () => {
    if (!notesEditor.value.item) return;
    try {
      await purchaseOrderStore.updateItemReturn(notesEditor.value.item.id, {
        notes: notesEditor.value.content,
      });
      showToast('success', 'Notes updated');
      closeNotesEditor();
      await loadItemReturns();
    } catch (e) {
      showToast('error', e?.message || 'Failed to update notes');
    }
  };

  // Lifecycle
  onMounted(() => {
    loadItemReturns();

    // Add click outside handler for custom month picker
    document.addEventListener('click', (event) => {
      const customMonthPicker = document.querySelector(
        '[data-custom-month-picker]'
      );
      if (customMonthPicker && !customMonthPicker.contains(event.target)) {
        showCustomMonthPicker.value = false;
      }
    });
  });

  watch(
    () => props.purchaseOrderId,
    () => {
      if (props.show) {
        loadItemReturns();
      }
    }
  );

  watch(
    () => props.show,
    (newValue) => {
      if (newValue) {
        loadItemReturns();
      }
    }
  );
</script>

<template>
  <dialog id="po_return_items_modal" class="modal" :open="show">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-7xl">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="font-bold text-xl text-black">Item Returns Audit Trail</h3>
          <p class="text-sm text-black/60">
            {{
              props.purchaseOrderId
                ? `Purchase Order #${props.purchaseOrderId}`
                : 'All Purchase Orders'
            }}
          </p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="onClose">✕</button>
      </div>

      <!-- Statistics -->
      <div
        class="stats shadow w-full mb-6 bg-white border border-black/10 stats-vertical lg:stats-horizontal"
      >
        <div class="stat">
          <div class="stat-figure">
            <Clock class="w-6 h-6 text-warning" />
          </div>
          <div class="stat-title text-black/50">Pending</div>
          <div class="stat-value text-warning">
            <span v-if="!loading">{{ returnStats.pending }}</span>
            <span v-else class="loading loading-spinner loading-sm"></span>
          </div>
        </div>
      </div>

      <!-- Filters and Actions -->
      <div class="space-y-4 mb-6">
        <!-- Search Bar -->
        <div class="flex gap-3">
          <div class="relative flex-1">
            <Search
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black/50"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search returns by item, reason, or received by..."
              class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full"
            />
          </div>
          <button
            class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
            @click="clearFilters"
          >
            <RefreshCcw class="w-4 h-4 mr-1" />
            Clear
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Status Filter -->
          <div class="grid grid-cols-1 gap-1">
            <label class="text-sm font-medium text-black/70">Status</label>
            <select
              v-model="statusFilter"
              class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
            >
              <option value="">All Statuses</option>
              <option
                v-for="status in uniqueStatuses"
                :key="status"
                :value="status"
              >
                {{ status }}
              </option>
            </select>
          </div>

          <!-- Reason Filter -->
          <div class="grid grid-cols-1 gap-1">
            <label class="text-sm font-medium text-black/70">Reason</label>
            <select
              v-model="reasonFilter"
              class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
            >
              <option value="">All Reasons</option>
              <option
                v-for="reason in uniqueReasons"
                :key="reason"
                :value="reason"
              >
                {{ reason }}
              </option>
            </select>
          </div>

          <!-- Date Filter -->
          <div class="grid grid-cols-1 gap-1">
            <label class="text-sm font-medium text-black/70">Date Range</label>
            <div class="grid grid-cols-[1fr_auto] gap-2">
              <select
                v-model="dateFilterType"
                class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
                @change="handleDateFilterChange"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Month</option>
              </select>
              <div v-if="dateFilterType === 'custom'" class="relative">
                <button
                  class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 h-full"
                  @click.stop="toggleCustomMonthPicker"
                >
                  <Calendar class="w-4 h-4" />
                </button>
                <div
                  v-if="showCustomMonthPicker"
                  data-custom-month-picker
                  class="absolute top-full right-0 mt-1 p-3 bg-white border border-primaryColor/30 rounded-lg shadow-lg z-10"
                  style="min-width: 200px"
                >
                  <div class="grid grid-cols-2 gap-2 mb-3" @click.stop>
                    <select
                      v-model="customMonthPicker.month"
                      class="select select-bordered select-sm"
                    >
                      <option v-for="month in 12" :key="month" :value="month">
                        {{
                          new Date(2024, month - 1).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                            }
                          )
                        }}
                      </option>
                    </select>
                    <select
                      v-model="customMonthPicker.year"
                      class="select select-bordered select-sm"
                    >
                      <option
                        v-for="year in availableYears"
                        :key="year"
                        :value="year"
                      >
                        {{ year }}
                      </option>
                    </select>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      class="btn btn-sm bg-primaryColor font-thin text-white"
                      @click.stop="selectCustomMonth"
                    >
                      Apply
                    </button>
                    <button
                      class="btn btn-sm btn-ghost font-thin"
                      @click.stop="showCustomMonthPicker = false"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredReturns.length === 0" class="text-center py-8">
        <div class="mb-4">
          <Package class="w-16 h-16 mx-auto text-primaryColor/40" />
        </div>
        <h4 class="text-lg font-semibold mb-2 text-black">No Returns Found</h4>
        <p class="text-black/60">
          {{
            searchQuery ||
            statusFilter ||
            reasonFilter ||
            dateFilterType !== 'all'
              ? 'No returns match your current filters.'
              : 'No item returns have been logged yet.'
          }}
        </p>
      </div>

      <!-- Returns Table -->
      <div v-else class="overflow-x-auto">
        <table class="table table-zebra w-full table-xs">
          <thead>
            <tr class="border border-gray-200">
              <th class="text-black font-semibold">Item</th>
              <th class="text-black font-semibold">Quantity</th>
              <th class="text-black font-semibold">Reason</th>
              <th class="text-black font-semibold">Status</th>
              <th class="text-black font-semibold">Received By</th>
              <th class="text-black font-semibold">Date</th>
              <th class="text-black font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="returnItem in paginatedReturns"
              :key="returnItem.id"
              class="border border-black"
            >
              <td>
                <div class="font-bold">
                  {{ returnItem.item_name || 'N/A' }}
                </div>
              </td>
              <td class="font-medium">{{ returnItem.return_quantity }}</td>
              <td>
                <span :class="getReasonColor(returnItem.return_reason)">
                  {{ returnItem.return_reason }}
                </span>
              </td>
              <td>
                <span
                  class="badge badge-sm"
                  :class="getStatusColor(returnItem.status)"
                >
                  {{ returnItem.status }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <User class="w-4 h-4 text-black/50" />
                  <span class="text-sm">{{
                    returnItem.received_by ||
                    returnItem.processed_by ||
                    returnItem.logged_by ||
                    'N/A'
                  }}</span>
                </div>
              </td>
              <td>
                <div class="text-sm">
                  {{ formatDate(returnItem.created_at) }}
                </div>
                <div
                  v-if="returnItem.processed_at"
                  class="text-xs text-black/60"
                >
                  Processed: {{ formatDate(returnItem.processed_at) }}
                </div>
              </td>
              <td>
                <div class="dropdown dropdown-left dropdown-center">
                  <label tabindex="0" class="btn btn-ghost btn-xs">
                    <EllipsisVertical class="w-4 h-4" />
                  </label>
                  <ul
                    tabindex="0"
                    class="dropdown-content menu p-2 shadow bg-white rounded-box w-48 border border-black/10"
                  >
                    <li>
                      <a
                        @click="openNotesEditor(returnItem)"
                        class="text-black/70"
                      >
                        <FileText class="w-4 h-4" />
                        Edit Notes / Proof
                      </a>
                    </li>
                    <!-- Send to Supplier (Pending or Processed) -->
                    <li
                      v-if="
                        ['Pending', 'Processed'].includes(returnItem.status)
                      "
                    >
                      <a @click="sendToSupplier(returnItem)" class="text-info">
                        <Package class="w-4 h-4" />
                        Send to Supplier
                      </a>
                    </li>

                    <!-- Complete Return (Pending or Processed) -->
                    <li
                      v-if="
                        ['Pending', 'Processed'].includes(returnItem.status) &&
                        isMarkedForSupplier(returnItem)
                      "
                    >
                      <a
                        @click="completeReturn(returnItem)"
                        class="text-success"
                      >
                        <CheckCircle class="w-4 h-4" />
                        Complete
                      </a>
                    </li>
                    <!-- Cancel Return (Pending only) -->
                    <li v-if="returnItem.status === 'Pending'">
                      <a @click="cancelReturn(returnItem)" class="text-error">
                        <AlertTriangle class="w-4 h-4" />
                        Cancel
                      </a>
                    </li>

                    <!-- Add a "View Receipt" action for completed returns -->
                    <li v-if="returnItem.status === 'Completed'">
                      <a
                        @click="openReturnReceipt(returnItem)"
                        class="text-black/50"
                      >
                        <FileText class="w-4 h-4 text-black/50" />
                        View Receipt
                      </a>
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="flex justify-between items-center mt-6"
        >
          <div class="text-sm text-black/60">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
            {{ Math.min(currentPage * itemsPerPage, filteredReturns.length) }}
            of {{ filteredReturns.length }} returns
          </div>

          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              «
            </button>
            <button
              v-for="page in totalPages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': currentPage === page }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  </dialog>

  <!-- Toast Notification -->
  <div class="toast toast-end" v-if="toast.show">
    <div
      :class="{
        'alert alert-success': toast.type === 'success',
        'alert alert-error': toast.type === 'error',
      }"
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>

  <!-- Confirmation Modal -->
  <dialog id="po_confirm_modal" class="modal" :open="confirmDialog.show">
    <div class="modal-box bg-accentColor text-black/70 shadow-lg max-w-md">
      <h3 class="font-bold text-lg text-black mb-2">
        {{ confirmDialog.title }}
      </h3>
      <p class="whitespace-pre-line text-sm">{{ confirmDialog.message }}</p>
      <div class="modal-action">
        <button
          class="btn btn-sm bg-gray-200 text-black/60 font-thin border-none hover:bg-gray-300"
          @click="confirmNo"
        >
          {{ confirmDialog.cancelText }}
        </button>
        <button
          class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          @click="confirmYes"
        >
          {{ confirmDialog.confirmText }}
        </button>
      </div>
    </div>
  </dialog>

  <!-- NEW: Return Receipt Modal -->
  <dialog id="return_receipt_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-4xl">
      <div class="flex justify-between items-center mb-2 text-black">
        <div class="flex items-center gap-2 mb-2 w-full">
          <img src="/logo1.png" alt="" class="w-10 h-10" />
          <h3 class="font-bold text-lg">Countryside Steakhouse</h3>
        </div>
        <div class="flex flex-col items-end w-full">
          <p class="text-xs">
            {{
              new Date(
                returnReceiptModal.item?.processed_at ||
                  returnReceiptModal.item?.created_at ||
                  Date.now()
              ).toLocaleString('en-PH')
            }}
          </p>
          <p class="text-xs">
            Return Receipt #: {{ returnReceiptModal.item?.id }}
          </p>
        </div>
      </div>

      <div v-if="returnReceiptModal.item" class="space-y-4">
        <!-- Header -->
        <div class="border-b border-black/20 pb-4">
          <h4 class="font-semibold text-lg text-black">Return Receipt</h4>
          <p class="text-sm text-black/70">
            PO Number:
            {{ returnReceiptModal.po?.po_number || 'N/A' }}
          </p>
          <p class="text-xs text-black/50">
            Supplier: {{ returnReceiptModal.po?.supplier_name || 'N/A' }}
          </p>
          <p class="text-xs text-black/50">
            Return Date:
            {{
              new Date(
                returnReceiptModal.item.processed_at ||
                  returnReceiptModal.item.created_at
              ).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            }}
          </p>
        </div>

        <!-- Details Table -->
        <div class="overflow-x-auto">
          <table class="table table-xs text-black">
            <thead class="text-black text-xs">
              <tr class="border border-black">
                <th class="border border-black">Item</th>
                <th class="border border-black">Returned Qty</th>
                <th class="border border-black">Reason</th>
                <th class="border border-black">Processed By</th>
                <th class="border border-black">Return Value (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border border-black">
                <td class="border border-black">
                  {{ returnReceiptModal.item.item_name || 'N/A' }}
                </td>
                <td class="border border-black">
                  {{ returnReceiptModal.item.return_quantity }}
                </td>
                <td class="border border-black">
                  {{ returnReceiptModal.item.return_reason }}
                </td>
                <td class="border border-black">
                  {{
                    returnReceiptModal.item.received_by ||
                    returnReceiptModal.item.processed_by ||
                    'N/A'
                  }}
                </td>
                <td class="border border-black">
                  ₱{{
                    Number(
                      computeReturnValue(
                        returnReceiptModal.po,
                        returnReceiptModal.item
                      )
                    ).toFixed(2)
                  }}
                </td>
              </tr>
              <tr class="border border-black">
                <td
                  colspan="4"
                  class="text-right font-semibold border border-black"
                >
                  Total
                </td>
                <td class="font-semibold border border-black">
                  ₱{{
                    Number(
                      computeReturnValue(
                        returnReceiptModal.po,
                        returnReceiptModal.item
                      )
                    ).toFixed(2)
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Notes (rich content) -->
        <div class="mt-4 text-black">
          <h6 class="text-xs font-medium">Notes / Proof:</h6>
          <div
            class="prose max-w-none text-xs border border-black/30 rounded-md p-2"
            v-html="returnReceiptModal.item.notes || 'No notes provided'"
          ></div>
        </div>

        <!-- Status -->
        <div class="flex justify-between items-center">
          <span class="text-sm text-black/70">Status:</span>
          <span
            class="badge badge-sm"
            :class="getStatusColor(returnReceiptModal.item.status)"
          >
            {{ returnReceiptModal.item.status }}
          </span>
        </div>

        <!-- Supplier/Receiver Signatures -->
        <div class="flex justify-between mt-8 w-full">
          <div class="flex flex-col items-start">
            <div class="border-b border-black w-[280px] mb-1"></div>
            <div class="text-xs text-gray-600">Supplier Signature</div>
          </div>
          <div class="flex flex-col items-end">
            <div class="border-b border-black w-[280px] mb-1"></div>
            <div class="text-xs text-gray-600">Received by</div>
          </div>
        </div>
      </div>

      <div class="modal-action flex gap-2 mt-6">
        <button
          class="btn btn-sm bg-primaryColor text-white font-thin border border-none hover:bg-primaryColor/80 shadow-none"
          @click="printReturnReceipt"
          :disabled="!returnReceiptModal.item"
        >
          Print Receipt
        </button>
        <button
          class="btn btn-sm bg-gray-200 text-black/50 font-thin border border-none hover:bg-gray-300 shadow-none"
          @click="closeReturnReceipt"
        >
          Close
        </button>
      </div>
    </div>
  </dialog>

  <!-- Notes / Proof Editor Modal -->
  <dialog id="po_notes_editor_modal" class="modal" :open="notesEditor.show">
    <div class="modal-box bg-accentColor text-black/70 shadow-lg max-w-2xl">
      <h3 class="font-bold text-lg text-black mb-2">Edit Notes / Proof</h3>
      <p class="text-sm text-black/60 mb-3">
        Attach images or add details about the return. This will appear in the
        audit trail and receipt.
      </p>
      <Editor v-model="notesEditor.content" :init="tinyMCEConfig" />
      <div class="modal-action">
        <button
          class="btn btn-sm bg-gray-200 text-black/60 font-thin border-none hover:bg-gray-300"
          @click="closeNotesEditor"
        >
          Cancel
        </button>
        <button
          class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          @click="saveNotesEditor"
        >
          Save
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }

  .table th {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .table td {
    vertical-align: middle;
    padding: 0.75rem;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  .dropdown-content {
    z-index: 1000;
  }

  .dropdown-content li a {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .dropdown-content li a:hover {
    background-color: rgba(var(--primaryColor-rgb), 0.1);
  }

  @media (max-width: 768px) {
    .stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .table {
      font-size: 0.75rem;
    }

    .table th,
    .table td {
      padding: 0.5rem 0.25rem;
    }
  }

  @media print {
    body * {
      visibility: hidden;
    }
    #return_receipt_modal,
    #return_receipt_modal * {
      visibility: visible;
    }
    #return_receipt_modal {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: white;
      padding: 20px;
      box-shadow: none;
      border: none;
    }
    #return_receipt_modal .modal-box {
      max-height: none;
      overflow-y: visible;
      padding: 0;
      box-shadow: none;
      border: none;
    }
    #return_receipt_modal .modal-action {
      position: fixed;
      bottom: 20px;
      right: 20px;
      gap: 10px;
    }
    #return_receipt_modal .modal-action button {
      padding: 8px 15px;
      font-size: 0.875rem;
    }
    #return_receipt_modal .modal-action button:first-child {
      background-color: var(--primaryColor);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 15px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    #return_receipt_modal .modal-action button:last-child {
      background-color: #e0e0e0;
      color: #333;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 8px 15px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    #return_receipt_modal .modal-action button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    #return_receipt_modal .modal-action button:hover:not(:disabled) {
      opacity: 0.9;
    }
    #return_receipt_modal .modal-action button:active:not(:disabled) {
      transform: scale(0.98);
    }
    #return_receipt_modal .modal-action button:focus {
      outline: none;
    }
    #return_receipt_modal .modal-action button:focus-visible {
      box-shadow:
        0 0 0 3px var(--primaryColor),
        0 0 0 6px var(--primaryColor);
    }
    #return_receipt_modal .modal-action button:active:not(:disabled) {
      transform: scale(0.98);
    }
    #return_receipt_modal .modal-action button:focus {
      outline: none;
    }
    #return_receipt_modal .modal-action button:focus-visible {
      box-shadow:
        0 0 0 3px var(--primaryColor),
        0 0 0 6px var(--primaryColor);
    }
  }
</style>

<style>
  /* Raise TinyMCE dialogs above DaisyUI modal */
  .tox,
  .tox-tinymce-aux,
  .tox-silver-sink,
  .tox-dialog-wrap,
  .tox-dialog {
    z-index: 99999 !important;
  }
</style>
