<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { usePOSStore } from '../../stores/posStore.js';
  import { getCurrentPhilippineTime } from '../../utils/timezoneUtils.js';

  const props = defineProps({
    branchId: { type: [Number, String], required: true },
    period: { type: String, default: 'today' }, // today | week | month | year
    metric: { type: String, default: 'remitted' }, // remitted | refunds | disposed | net
    autoLoad: { type: Boolean, default: true },
    // When period === 'customMonth', expect YYYY-MM (e.g., '2025-09')
    customMonth: { type: String, default: '' },
    // When viewing a specific remittance, provide its date range
    remittanceDateRange: { type: Object, default: null }, // { dateFrom, dateTo }
  });

  const posStore = usePOSStore();
  const loading = ref(false);
  const labels = ref([]);
  const series = ref([]);

  const getDateRange = (period) => {
    // If we have a remittance date range, use it instead of calculating from period
    if (
      props.remittanceDateRange &&
      props.remittanceDateRange.dateFrom &&
      props.remittanceDateRange.dateTo
    ) {
      return {
        dateFrom: props.remittanceDateRange.dateFrom,
        dateTo: props.remittanceDateRange.dateTo,
        bucket: 'day', // Use day bucket for remittance-specific ranges
      };
    }

    const now = getCurrentPhilippineTime();
    let start,
      end,
      bucket = 'auto';

    if (period === 'today') {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      bucket = 'hour';
    } else if (period === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      bucket = 'day';
    } else if (period === 'customMonth') {
      const ym = String(props.customMonth || '').trim();
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      start =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? new Date(year, monthIndex, 1, 0, 0, 0, 0)
          : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
          : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      bucket = 'day';
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      bucket = 'day';
    } else {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      bucket = 'month';
    }

    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      bucket,
    };
  };

  const loadTrendData = async () => {
    if (!props.branchId) return;

    loading.value = true;
    try {
      const { dateFrom, dateTo, bucket } = getDateRange(props.period);

      // For remitted data, fetch actual remittance records instead of sales trends
      if (props.metric === 'remitted') {
        const { data: remittances } = await posStore.fetchRemittances({
          branchId: props.branchId,
          status: 'approved',
          limit: 1000,
        });

        // Group remittances by date and aggregate amounts
        const dailyMap = new Map();
        (remittances || []).forEach((r) => {
          const approvedAt = new Date(
            r.approved_at || r.created_at || r.date_to || r.date_from
          );
          const startDate = new Date(dateFrom);
          const endDate = new Date(dateTo);

          if (approvedAt >= startDate && approvedAt <= endDate) {
            // Convert to Philippine timezone for date key
            const phDate = new Date(
              approvedAt.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
            );
            const dateKey = phDate.toISOString().split('T')[0];
            const prev = dailyMap.get(dateKey) || 0;
            dailyMap.set(dateKey, prev + Number(r.remitted_amount || 0));
          }
        });

        const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => {
          // Sort dates chronologically, not alphabetically
          return new Date(a) - new Date(b);
        });
        labels.value = sortedDates;
        series.value = sortedDates.map((date) =>
          Number(dailyMap.get(date) || 0)
        );
      } else {
        // For all other metrics, use remittance data (not sales trends)
        // Since this is the "Remitted Sales" page, ALL data should come from remittances
        const { data: remittances } = await posStore.fetchRemittances({
          branchId: props.branchId,
          status: 'approved',
          limit: 1000,
        });

        // Group remittances by date and aggregate the requested metric
        const dailyMap = new Map();
        (remittances || []).forEach((r) => {
          const approvedAt = new Date(
            r.approved_at || r.created_at || r.date_to || r.date_from
          );
          const startDate = new Date(dateFrom);
          const endDate = new Date(dateTo);

          if (approvedAt >= startDate && approvedAt <= endDate) {
            // Convert to Philippine timezone for date key
            const phDate = new Date(
              approvedAt.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
            );
            const dateKey = phDate.toISOString().split('T')[0];

            // Get the current amount for this date
            const current = dailyMap.get(dateKey) || 0;

            // Add the appropriate metric based on props.metric
            let metricAmount = 0;
            if (props.metric === 'refunds') {
              metricAmount = Number(r.refunded_amount || 0);
            } else if (props.metric === 'disposed') {
              metricAmount = Number(r.disposed || 0);
            } else if (props.metric === 'net') {
              metricAmount = Number(r.net_sales || 0);
            } else {
              // Fallback to remitted amount
              metricAmount = Number(r.remitted_amount || 0);
            }

            dailyMap.set(dateKey, current + metricAmount);
          }
        });

        const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => {
          // Sort dates chronologically, not alphabetically
          return new Date(a) - new Date(b);
        });

        labels.value = sortedDates;
        series.value = sortedDates.map((date) =>
          Number(dailyMap.get(date) || 0)
        );
      }
    } catch (err) {
      console.error('Failed to load trend data:', err);
      labels.value = [];
      series.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Auto-load when component mounts or props change
  watch(
    [
      () => props.branchId,
      () => props.period,
      () => props.metric,
      () => props.remittanceDateRange,
    ],
    () => {
      if (props.autoLoad) {
        loadTrendData();
      }
    },
    { immediate: true }
  );

  onMounted(() => {
    if (props.autoLoad) {
      loadTrendData();
    }
  });

  // Expose methods for parent components
  defineExpose({
    loadTrendData,
    labels,
    series,
    loading,
  });
</script>

<template>
  <div class="sales-trend-chart">
    <div v-if="loading" class="flex justify-center py-8">
      <div class="loading loading-spinner loading-md text-primaryColor"></div>
    </div>
    <div v-else-if="labels.length === 0" class="text-center py-8 text-gray-500">
      No trend data available
    </div>
    <div v-else>
      <!-- Chart will be rendered here by parent component -->
      <slot :labels="labels" :series="series" :loading="loading" />
    </div>
  </div>
</template>

<style scoped>
  .sales-trend-chart {
    min-height: 200px;
  }
</style>
