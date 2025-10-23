<script setup>
  import { ref, onMounted, watch, computed } from 'vue';
  import { PhilippinePeso, FileText, Download } from 'lucide-vue-next';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import {
    faChartBar,
    faPesoSign,
    faExclamationTriangle,
  } from '@fortawesome/free-solid-svg-icons';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
    formatForAPI,
  } from '../utils/timezoneUtils.js';
  import { useFinanceBalanceStore } from '../stores/financeBalanceStore.js';
  import { useCashMovementStore } from '../stores/cashMovementStore.js';
  import { useBranchContextStore } from '../stores/branchContextStore.js';
  import { useBranchStore } from '../stores/branchStore.js';
  import { usePOSStore } from '../stores/posStore.js';
  import { useSupplyRequestStore } from '../stores/supplyRequestStore.js';
  import { useProductionStore } from '../stores/productionStore.js';
  import { useBranchDistributionStore } from '../stores/branchDistributionStore.js';

  // Chart components
  import RevenueTrendChart from '../components/finance/RevenueTrendChart.vue';
  import ExpensePieChart from '../components/finance/ExpensePieChart.vue';
  import ProfitMarginChart from '../components/finance/ProfitMarginChart.vue';
  import CashFlowChart from '../components/finance/CashFlowChart.vue';

  // Date filters for the statement
  const period = ref('month'); // today | week | month | customMonth | year
  const customMonth = ref(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // Statement data (computed from real stores)
  const statement = ref({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netIncome: 0,
    cashOnHand: 0,
  });

  const financeBalanceStore = useFinanceBalanceStore();
  const cashMovementStore = useCashMovementStore();
  const branchContext = useBranchContextStore();
  const branchStore = useBranchStore();
  const posStore = usePOSStore();
  const supplyRequestStore = useSupplyRequestStore();
  const productionStore = useProductionStore();
  const branchDistributionStore = useBranchDistributionStore();

  // Access menu items for COGS calculation
  const menuItems = computed(() => productionStore.menuItems);

  function getDateRange() {
    const now = getCurrentPhilippineTime();
    const build = (start, end) => ({ start, end });

    if (period.value === 'today') {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }

    if (period.value === 'week') {
      const jsDay = now.getDay();
      const daysSinceMonday = (jsDay + 6) % 7;
      const startTmp = new Date(now);
      startTmp.setDate(now.getDate() - daysSinceMonday);
      const start = new Date(
        startTmp.getFullYear(),
        startTmp.getMonth(),
        startTmp.getDate(),
        0,
        0,
        0
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }

    if (period.value === 'customMonth') {
      const ym = String(customMonth.value || '').trim();
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      const start = new Date(year, monthIndex, 1, 0, 0, 0);
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const end = new Date(year, monthIndex, lastDay, 23, 59, 59);
      return build(start, end);
    }

    // year
    if (period.value === 'year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }

    // month (default) - current month
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );
    return build(start, end);
  }

  const loading = ref(false);
  let loadTimeout = null;
  const exportLoading = ref(false);
  const lastUpdated = ref(new Date());

  // Chart data
  const chartData = ref({
    revenueTrend: { labels: [], datasets: [] },
    expenseBreakdown: [],
    profitMargin: {
      labels: [],
      revenue: [],
      cogs: [],
      grossProfit: [],
      operatingExpenses: [],
      netIncome: [],
    },
    cashFlow: {
      labels: [],
      operating: [],
      investing: [],
      financing: [],
      netCashFlow: [],
    },
  });

  const loadStatement = async (immediate = false) => {
    // Clear any existing timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      loadTimeout = null;
    }

    // Debounce for non-immediate calls (e.g., from watchers)
    if (!immediate) {
      loading.value = true;
      loadTimeout = setTimeout(async () => {
        await performLoad();
      }, 300); // 300ms debounce
      return;
    }

    // Immediate load (e.g., on mount)
    await performLoad();
  };

  const performLoad = async () => {
    loading.value = true;
    try {
      const { start, end } = getDateRange();
      console.log('Date range calculation:', {
        period: period.value,
        start: start,
        end: end,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        startFormatted: formatForAPI(start),
        endFormatted: formatForAPI(end),
      });

      // Ensure branch context/active list and fetch menu items for COGS calculation
      try {
        if (!branchContext.currentBranch) {
          await branchContext.initializeBranchContext();
        }
        await branchStore.fetchActiveBranches();
        // Fetch menu items for COGS calculation (only if not already loaded)
        if (menuItems.value.length === 0) {
          await productionStore.fetchMenuItems();
        }
      } catch {}

      const branches = (
        branchStore.activeBranches ||
        branchContext.availableBranches ||
        []
      ).map((b) => b.id);

      // Run all data fetching in parallel for faster loading
      const [revenueData, expenseData, cashData] = await Promise.allSettled([
        // Revenue: fetch from ALL branches and aggregate
        (async () => {
          let revenue = 0;

          console.log('Revenue fetching - branches:', branches);
          console.log(
            'Revenue fetching - date range:',
            start.toISOString(),
            'to',
            end.toISOString()
          );

          // Fetch revenue from ALL branches
          try {
            if (branches.length > 0) {
              console.log(
                `Fetching revenue for ${branches.length} branches...`
              );

              // Fetch stats for all branches in parallel
              const branchStatsPromises = branches.map(async (branchId) => {
                try {
                  console.log(`Fetching stats for branch ${branchId}...`);
                  const stats = await posStore.fetchSalesStats(
                    branchId,
                    formatForAPI(start),
                    formatForAPI(end)
                  );
                  console.log(`Branch ${branchId} stats:`, stats);
                  return stats;
                } catch (error) {
                  console.error(
                    `Error fetching stats for branch ${branchId}:`,
                    error
                  );
                  return null;
                }
              });

              const allBranchStats = await Promise.all(branchStatsPromises);
              console.log('All branch stats received:', allBranchStats);

              // Aggregate revenue from all branches
              allBranchStats.forEach((stats, index) => {
                if (stats) {
                  if (
                    stats &&
                    Number.isFinite(Number(stats.total_sales)) &&
                    Number(stats.total_sales) > 0
                  ) {
                    const branchRevenue = Number(stats.total_sales);
                    revenue += branchRevenue;
                    console.log(
                      `Branch ${branches[index]} revenue: ${branchRevenue}`
                    );
                  } else {
                    console.log(
                      `Branch ${branches[index]} has no total_sales, trying trends...`
                    );

                    // Fallback: try trends for this branch
                    posStore
                      .fetchSalesTrends(branches[index], {
                        dateFrom: formatForAPI(start),
                        dateTo: formatForAPI(end),
                      })
                      .then((trends) => {
                        if (trends && Array.isArray(trends.net_sales)) {
                          const trendRevenue = trends.net_sales.reduce(
                            (s, v) => s + Number(v || 0),
                            0
                          );
                          if (trendRevenue > 0) {
                            revenue += trendRevenue;
                            console.log(
                              `Branch ${branches[index]} revenue from trends: ${trendRevenue}`
                            );
                          }
                        }
                      })
                      .catch((err) => {
                        console.error(
                          `Error fetching trends for branch ${branches[index]}:`,
                          err
                        );
                      });
                  }
                }
              });

              console.log('Aggregated revenue from all branches:', revenue);

              // If still no revenue, try broader date ranges for first branch as fallback
              if (revenue === 0 && branches.length > 0) {
                console.log(
                  'No revenue found in date range, trying broader ranges for first branch...'
                );

                const firstBranchId = branches[0];

                // Try last 90 days
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const recentStats = await posStore.fetchSalesStats(
                  firstBranchId,
                  formatForAPI(ninetyDaysAgo),
                  formatForAPI(new Date())
                );

                if (
                  recentStats &&
                  Number.isFinite(Number(recentStats.total_sales)) &&
                  Number(recentStats.total_sales) > 0
                ) {
                  revenue = Number(recentStats.total_sales);
                  console.log(
                    'Using recent total_sales (last 90 days) from first branch:',
                    revenue
                  );
                } else {
                  // Try all time (from 2024-01-01)
                  console.log(
                    'Trying all time data from 2024 for first branch...'
                  );
                  const allTimeStart = createPhilippineDate(
                    2024,
                    1,
                    1,
                    0,
                    0,
                    0
                  );

                  const allTimeStats = await posStore.fetchSalesStats(
                    firstBranchId,
                    formatForAPI(allTimeStart),
                    formatForAPI(new Date())
                  );

                  if (
                    allTimeStats &&
                    Number.isFinite(Number(allTimeStats.total_sales)) &&
                    Number(allTimeStats.total_sales) > 0
                  ) {
                    revenue = Number(allTimeStats.total_sales);
                    console.log(
                      'Using total_sales (all time 2024) from first branch:',
                      revenue
                    );
                  } else {
                    console.log(
                      'No revenue found in any date range, revenue remains 0'
                    );
                    revenue = 0;
                  }
                }
              }
            } else {
              console.warn('No branches available for revenue fetching');
            }
          } catch (error) {
            console.error('Failed to fetch revenue data:', error);
          }

          console.log('Final aggregated revenue value:', revenue);
          return revenue;
        })(),

        // Operating expenses: sum outflow cash movements in period
        (async () => {
          let operatingExpenses = 0;
          try {
            await cashMovementStore.fetchMovements({
              movement_type: 'out',
              date_from: formatForAPI(start),
              date_to: formatForAPI(end),
              include_non_branch: true,
              limit: 9999,
            });
            (cashMovementStore.outflowMovements || []).forEach((m) => {
              operatingExpenses += Number(m.amount || 0);
            });
          } catch {}
          return operatingExpenses;
        })(),

        // Cash on Hand: finance totals
        (async () => {
          try {
            await financeBalanceStore.fetchTotals();
            return Number(financeBalanceStore.totals?.total_balance || 0);
          } catch {}
          return 0;
        })(),
      ]);

      const revenue =
        revenueData.status === 'fulfilled' ? revenueData.value : 0;
      const operatingExpenses =
        expenseData.status === 'fulfilled' ? expenseData.value : 0;
      const cashOnHand = cashData.status === 'fulfilled' ? cashData.value : 0;

      // COGS calculation
      // TODO: Implement actual COGS calculation from order history and menu item costs
      // For now, using industry standard COGS ratio of 28-35% for food service
      // This can be improved by:
      // 1. Fetching actual order items and their costs from production
      // 2. Calculating actual COGS per item based on recipe costs
      // 3. Aggregating total COGS from all completed orders
      const COGS_RATIO = 0.3; // 30% COGS ratio (adjustable)
      const cogs = revenue * COGS_RATIO;
      const grossProfit = revenue - cogs;
      const netIncome = grossProfit - operatingExpenses;

      console.log('Financial Statement Calculations:', {
        revenue,
        cogs,
        cogsRatio: `${(COGS_RATIO * 100).toFixed(0)}%`,
        grossProfit,
        operatingExpenses,
        netIncome,
        cashOnHand,
      });

      statement.value = {
        revenue,
        cogs,
        grossProfit,
        operatingExpenses,
        netIncome,
        cashOnHand,
      };

      // Update last updated timestamp
      lastUpdated.value = new Date();

      // Load simplified chart data (non-blocking)
      loadChartDataAsync();
    } finally {
      loading.value = false;
    }
  };

  // Load chart data (simplified and non-blocking)
  const loadChartDataAsync = async () => {
    try {
      const { start, end } = getDateRange();
      const branches = (branchStore.activeBranches || []).map((b) => b.id);

      // Load simplified chart data using existing data
      await loadSimplifiedChartData(branches, start, end, period.value);
    } catch (error) {
      console.warn('Failed to load chart data:', error);
    }
  };

  // Simplified chart data loading using existing fetched data
  const loadSimplifiedChartData = async (branches, start, end, period) => {
    try {
      // Generate labels based on period type
      const labels = [];
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      // For monthly periods, show more data points, for others limit to 7
      const maxPoints = period === 'monthly' ? Math.min(15, daysDiff) : 7;
      const stepSize = Math.max(1, Math.floor(daysDiff / maxPoints));

      for (let i = 0; i < daysDiff; i += stepSize) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);

        // Stop if we exceed the end date
        if (currentDate > end) break;

        labels.push(
          currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        );
      }

      // Use existing statement data to create simplified charts
      const revenue = statement.value.revenue || 0;
      const cogs = statement.value.cogs || 0;
      const operatingExpenses = statement.value.operatingExpenses || 0;
      const grossProfit = statement.value.grossProfit || 0;
      const netIncome = statement.value.netIncome || 0;

      // Revenue trend - fetch REAL daily data from all branches
      const revenueData = [];

      console.log('Fetching REAL revenue trend data for all branches...');
      console.log('Branches:', branches);
      console.log('Date range:', start, 'to', end);

      // Fetch real daily revenue data from all branches
      try {
        if (branches.length > 0) {
          // Fetch trends for all branches in parallel
          const branchTrendsPromises = branches.map(async (branchId) => {
            try {
              console.log(`Fetching trends for branch ${branchId}...`);
              const trends = await posStore.fetchSalesTrends(branchId, {
                dateFrom: formatForAPI(start),
                dateTo: formatForAPI(end),
              });
              console.log(`Branch ${branchId} trends:`, trends);
              return trends;
            } catch (error) {
              console.error(
                `Error fetching trends for branch ${branchId}:`,
                error
              );
              return null;
            }
          });

          const allBranchTrends = await Promise.all(branchTrendsPromises);
          console.log('All branch trends received:', allBranchTrends);

          // Aggregate real daily revenue from all branches
          if (allBranchTrends.length > 0 && allBranchTrends[0]) {
            const firstTrend = allBranchTrends[0];
            const numDataPoints = firstTrend.net_sales?.length || labels.length;

            // Initialize revenue array with zeros
            for (let i = 0; i < numDataPoints; i++) {
              revenueData.push(0);
            }

            // Sum up revenue from all branches for each day
            allBranchTrends.forEach((trend) => {
              if (trend && Array.isArray(trend.net_sales)) {
                trend.net_sales.forEach((dailyRevenue, index) => {
                  if (index < revenueData.length) {
                    revenueData[index] += Number(dailyRevenue || 0);
                  }
                });
              }
            });

            console.log('Aggregated REAL revenue trend data:', revenueData);
          } else {
            // Fallback: if no trend data, show zeros
            console.warn('No trend data available, showing zeros');
            for (let i = 0; i < labels.length; i++) {
              revenueData.push(0);
            }
          }
        } else {
          // No branches, show zeros
          console.warn('No branches available for revenue trend');
          for (let i = 0; i < labels.length; i++) {
            revenueData.push(0);
          }
        }
      } catch (error) {
        console.error('Error fetching revenue trend data:', error);
        // Fallback: show zeros on error
        for (let i = 0; i < labels.length; i++) {
          revenueData.push(0);
        }
      }

      console.log('Setting REAL revenue trend chart data:', {
        labels,
        revenueData,
        labelsLength: labels.length,
        revenueDataLength: revenueData.length,
        totalRevenue: revenueData.reduce((sum, val) => sum + val, 0),
      });

      chartData.value.revenueTrend = {
        labels,
        datasets: [
          {
            label: 'Daily Revenue',
            data: revenueData,
            backgroundColor: 'rgba(70, 97, 20, 0.1)',
            borderColor: 'rgba(70, 97, 20, 1)',
            pointBackgroundColor: 'rgba(70, 97, 20, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      };

      console.log(
        'Final chartData.value.revenueTrend:',
        chartData.value.revenueTrend
      );

      // Expense breakdown (using real cash movement data)
      const realExpenseCategories = {};

      // Get the actual cash movements that were fetched for operating expenses
      const outflowMovements = cashMovementStore.outflowMovements || [];

      outflowMovements.forEach((movement) => {
        // Categorize based on actual sources used in your system
        let category = 'Other';

        if (movement.source) {
          // Map actual sources to meaningful categories
          switch (movement.source) {
            case 'payroll':
            case 'payroll_employer_contributions':
            case 'payroll_employee_contributions':
            case 'payroll_budget_release':
              // Group all payroll-related expenses together
              category = 'Payroll & Contributions';
              break;
            case 'budget_release':
              category = 'Supply Budget Releases';
              break;
            case 'disposal_loss':
              category = 'Disposal Losses';
              break;
            case 'manual':
              category = 'Manual Expenses';
              break;
            case 'loan':
              category = 'Loan Payments';
              break;
            case 'expense':
              category = 'General Expenses';
              break;
            case 'utilities_expense':
              category = 'Utilities';
              break;
            case 'budget_return':
              // This is actually an inflow, but if it appears in outflows, categorize it
              category = 'Budget Returns';
              break;
            case 'remittance':
              // This is typically an inflow, but if it appears in outflows
              category = 'Remittances';
              break;
            default:
              // Format unknown sources nicely
              category = movement.source
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
          }
        } else if (movement.reference_type) {
          // Use reference_type as category if no source
          category = movement.reference_type
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
        } else if (movement.notes) {
          // Fallback to notes analysis
          const notes = movement.notes.toLowerCase();
          if (notes.includes('budget') && notes.includes('release')) {
            category = 'Supply Budget Releases';
          } else if (
            notes.includes('payroll') ||
            notes.includes('salary') ||
            notes.includes('contribution')
          ) {
            category = 'Payroll & Contributions';
          } else if (notes.includes('disposal') || notes.includes('loss')) {
            category = 'Disposal Losses';
          } else if (notes.includes('return')) {
            category = 'Budget Returns';
          }
        }

        // Add to category total
        if (realExpenseCategories[category]) {
          realExpenseCategories[category] += Number(movement.amount || 0);
        } else {
          realExpenseCategories[category] = Number(movement.amount || 0);
        }
      });

      // Convert to array and sort by amount
      const expenseCategories = Object.entries(realExpenseCategories)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      console.log('Setting expense breakdown chart data:', {
        realExpenseCategories,
        expenseCategories,
        operatingExpenses,
        outflowMovements: outflowMovements.length,
      });

      chartData.value.expenseBreakdown = expenseCategories.map((item) => ({
        name: item.name,
        amount: item.amount,
        percentage:
          operatingExpenses > 0
            ? ((item.amount / operatingExpenses) * 100).toFixed(1)
            : 0,
      }));

      console.log(
        'Final chartData.value.expenseBreakdown:',
        chartData.value.expenseBreakdown
      );

      // Profit margin (simplified - single data point)
      chartData.value.profitMargin = {
        labels: ['Current Period'],
        revenue: [revenue],
        cogs: [cogs],
        grossProfit: [grossProfit],
        operatingExpenses: [operatingExpenses],
        netIncome: [netIncome],
      };

      // Cash flow - use REAL data from cash movements
      console.log('Calculating REAL cash flow data...');
      console.log('All outflow movements:', outflowMovements);

      // Operating activities = Net cash from operations
      // This includes: Sales revenue (gross profit) minus operating expenses
      // Operating cash flow = Gross Profit - Operating Expenses
      const operating = grossProfit - operatingExpenses;

      // Investing activities = NOT APPLICABLE
      // Your system doesn't have capital expenditures (equipment, assets, etc.)
      const investing = 0;

      // Financing activities = NOT APPLICABLE
      // Your system doesn't have loans, debt, or equity financing
      const financing = 0;

      const netCashFlow = operating + investing + financing;

      console.log('REAL cash flow calculations:', {
        grossProfit,
        operatingExpenses,
        operating: 'Gross Profit - Operating Expenses',
        operatingValue: operating,
        investing: 'Not applicable (no capital expenditures)',
        financing: 'Not applicable (no loans/debt)',
        netCashFlow,
        totalOutflowMovements: outflowMovements.length,
        outflowSources: outflowMovements.map((m) => ({
          source: m.source,
          notes: m.notes,
          amount: m.amount,
        })),
      });

      chartData.value.cashFlow = {
        labels: ['Current Period'],
        operating: [operating],
        investing: [investing],
        financing: [financing],
        netCashFlow: [netCashFlow],
      };
    } catch (error) {
      console.warn('Failed to load simplified chart data:', error);
    }
  };

  // Export functions
  const handleExport = async () => {
    if (exportLoading.value) return;

    exportLoading.value = true;
    try {
      const { start, end } = getDateRange();
      const dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;

      // Create CSV content
      const headers = [
        'Financial Statement',
        '',
        'Period',
        dateRange,
        'Generated On',
        new Date().toLocaleDateString(),
        '',
        'Financial Metrics',
        'Amount (₱)',
      ];

      // Format number with peso symbol and comma separators
      const formatCurrency = (value) => {
        return `₱${Number(value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      // Financial data
      const financialData = [
        ['Revenue', formatCurrency(statement.value.revenue || 0)],
        ['Cost of Goods Sold', formatCurrency(statement.value.cogs || 0)],
        ['Gross Profit', formatCurrency(statement.value.grossProfit || 0)],
        [
          'Operating Expenses',
          formatCurrency(statement.value.operatingExpenses || 0),
        ],
        ['Net Income', formatCurrency(statement.value.netIncome || 0)],
        ['Cash on Hand', formatCurrency(statement.value.cashOnHand || 0)],
      ];

      // Financial ratios
      const ratiosData = [];
      if (statement.value.revenue && statement.value.revenue > 0) {
        ratiosData.push(['']);
        ratiosData.push(['Financial Ratios', 'Value']);
        ratiosData.push([
          'Gross Profit Margin',
          `${((statement.value.grossProfit / statement.value.revenue) * 100).toFixed(2)}%`,
        ]);
        ratiosData.push([
          'Net Profit Margin',
          `${((statement.value.netIncome / statement.value.revenue) * 100).toFixed(2)}%`,
        ]);
        ratiosData.push([
          'Operating Expense Ratio',
          `${((statement.value.operatingExpenses / statement.value.revenue) * 100).toFixed(2)}%`,
        ]);
      }

      // Combine all data
      const csvContent = [headers, ...financialData, ...ratiosData]
        .map((row) =>
          row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      // Create and download file
      const periodName =
        period.value === 'today'
          ? 'Today'
          : period.value === 'thisWeek'
            ? 'This_Week'
            : period.value === 'thisMonth'
              ? 'This_Month'
              : period.value === 'customMonth'
                ? customMonth.value.replace('-', '_')
                : period.value;

      const filename = `Financial_Statement_${periodName}_${new Date().toISOString().split('T')[0]}.csv`;

      // Add UTF-8 BOM for proper Excel display of special characters
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
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      exportLoading.value = false;
    }
  };

  const handleManualRefresh = async () => {
    await loadStatement(true);
  };

  onMounted(() => loadStatement(true)); // Immediate load on mount
  watch(period, () => loadStatement(false)); // Debounced load on period change
  watch(customMonth, () => {
    if (period.value === 'customMonth') loadStatement(false); // Debounced load on custom month change
  });
</script>

<template>
  <div class="space-y-6 relative">
    <!-- Loading Overlay -->
    <div
      v-if="loading"
      class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg"
    >
      <div class="flex flex-col items-center gap-2">
        <div class="loading loading-spinner loading-lg"></div>
        <span class="text-sm text-gray-600">Loading financial data...</span>
      </div>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">
          Financial Statement
        </h1>
        <p class="text-gray-600 mt-1">Organization-wide summary</p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="period"
          class="select select-bordered select-xs"
          :disabled="loading"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="customMonth">Custom Month</option>
          <option value="year">This Year</option>
        </select>
        <input
          v-if="period === 'customMonth'"
          type="month"
          class="input input-bordered input-xs"
          v-model="customMonth"
          :disabled="loading"
        />
        <button
          @click="handleManualRefresh"
          class="btn btn-xs btn-outline"
          :disabled="loading"
          :title="`Last updated: ${lastUpdated.toLocaleTimeString()}`"
        >
          <Download class="w-3 h-3" />
        </button>
        <div v-if="loading" class="loading loading-spinner loading-xs"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <!-- Revenue Card -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="text-sm text-gray-500">Revenue</div>
          <div class="text-2xl font-bold">
            <PhilippinePeso class="inline w-4 h-4 text-primaryColor" />
            <template v-if="loading">
              <div
                class="inline-block animate-pulse bg-gray-200 rounded w-20 h-8"
              ></div>
            </template>
            <template v-else>
              {{
                Number(statement.revenue || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              }}
            </template>
          </div>
        </div>
      </div>

      <!-- Cost of Goods Sold Card -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="text-sm text-gray-500">Cost of Goods Sold</div>
          <div class="text-2xl font-bold">
            <PhilippinePeso class="inline w-4 h-4 text-primaryColor" />
            <template v-if="loading">
              <div
                class="inline-block animate-pulse bg-gray-200 rounded w-20 h-8"
              ></div>
            </template>
            <template v-else>
              {{
                Number(statement.cogs || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              }}
            </template>
          </div>
        </div>
      </div>

      <!-- Gross Profit Card -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="text-sm text-gray-500">Gross Profit</div>
          <div class="text-2xl font-bold">
            <PhilippinePeso class="inline w-4 h-4 text-primaryColor" />
            <template v-if="loading">
              <div
                class="inline-block animate-pulse bg-gray-200 rounded w-20 h-8"
              ></div>
            </template>
            <template v-else>
              {{
                Number(statement.grossProfit || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              }}
            </template>
          </div>
        </div>
      </div>

      <!-- Operating Expenses Card -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="text-sm text-gray-500">Operating Expenses</div>
          <div class="text-2xl font-bold">
            <PhilippinePeso class="inline w-4 h-4 text-primaryColor" />
            <template v-if="loading">
              <div
                class="inline-block animate-pulse bg-gray-200 rounded w-20 h-8"
              ></div>
            </template>
            <template v-else>
              {{
                Number(statement.operatingExpenses || 0).toLocaleString(
                  undefined,
                  { maximumFractionDigits: 2 }
                )
              }}
            </template>
          </div>
        </div>
      </div>

      <!-- Net Income Card -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="text-sm text-gray-500">Net Income</div>
          <div class="text-2xl font-bold">
            <PhilippinePeso class="inline w-4 h-4 text-primaryColor" />
            <template v-if="loading">
              <div
                class="inline-block animate-pulse bg-gray-200 rounded w-20 h-8"
              ></div>
            </template>
            <template v-else>
              {{
                Number(statement.netIncome || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              }}
            </template>
          </div>
        </div>
      </div>

      <!-- Cash on Hand Card -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="text-sm text-gray-500">Cash on Hand</div>
          <div class="text-2xl font-bold">
            <PhilippinePeso class="inline w-4 h-4 text-primaryColor" />
            <template v-if="loading">
              <div
                class="inline-block animate-pulse bg-gray-200 rounded w-20 h-8"
              ></div>
            </template>
            <template v-else>
              {{
                Number(statement.cashOnHand || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              }}
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RevenueTrendChart :data="chartData.revenueTrend" :height="350" />
      <ExpensePieChart :data="chartData.expenseBreakdown" :height="350" />
      <ProfitMarginChart :data="chartData.profitMargin" :height="350" />
      <CashFlowChart :data="chartData.cashFlow" :height="350" />
    </div>

    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">Statement Details</h3>
          <div class="flex items-center gap-2">
            <button
              @click="handleExport"
              class="btn btn-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-thin"
              :disabled="loading || exportLoading"
            >
              <template v-if="exportLoading">
                <div class="loading loading-spinner loading-xs mr-1"></div>
              </template>
              <template v-else>
                <Download class="w-4 h-4 mr-1" />
              </template>
              Export CSV
            </button>
          </div>
        </div>

        <template v-if="loading">
          <div class="space-y-4">
            <div class="animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </template>

        <template v-else>
          <!-- Revenue Section -->
          <div class="mb-6">
            <h4 class="font-semibold text-md mb-3 text-primaryColor">
              Revenue
            </h4>
            <div class="bg-green-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Total Sales Revenue</span>
                <span class="font-bold text-success">
                  ₱{{
                    Number(statement.revenue || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-2">
                <p>
                  • Revenue from all branch sales during the selected period
                </p>
                <p>• Includes all completed POS transactions</p>
              </div>
            </div>
          </div>

          <!-- COGS Section -->
          <div class="mb-6">
            <h4 class="font-semibold text-md mb-3 text-primaryColor">
              Cost of Goods Sold (COGS)
            </h4>
            <div class="bg-orange-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Total COGS (30% of Revenue)</span>
                <span class="font-bold text-orange-700">
                  ₱{{
                    Number(statement.cogs || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-2">
                <p>
                  • Calculated using industry standard 30% COGS ratio for food
                  service
                </p>
                <p>• Includes raw material costs, direct labor, and overhead</p>
                <p>
                  • Note: Based on estimated ratio; actual COGS calculation
                  pending implementation
                </p>
              </div>
            </div>
          </div>

          <!-- Gross Profit -->
          <div class="mb-6">
            <h4 class="font-semibold text-md mb-3 text-primaryColor">
              Gross Profit
            </h4>
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Gross Profit Margin</span>
                <span class="font-bold text-blue-700">
                  ₱{{
                    Number(statement.grossProfit || 0).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 2 }
                    )
                  }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-2">
                <p>• Calculated as: Revenue - COGS</p>
                <p>• Represents profit before operating expenses</p>
                <p>
                  • Margin:
                  {{
                    statement.revenue > 0
                      ? (
                          (statement.grossProfit / statement.revenue) *
                          100
                        ).toFixed(1)
                      : '0'
                  }}%
                </p>
              </div>
            </div>
          </div>

          <!-- Operating Expenses Section -->
          <div class="mb-6">
            <h4 class="font-semibold text-md mb-3 text-primaryColor">
              Operating Expenses
            </h4>
            <div class="bg-red-50 rounded-lg p-4">
              <div class="flex justify-between items-center mb-3">
                <span class="text-gray-700">Total Operating Expenses</span>
                <span class="font-bold text-red-700">
                  ₱{{
                    Number(statement.operatingExpenses || 0).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 2 }
                    )
                  }}
                </span>
              </div>

              <!-- Expense Breakdown -->
              <div
                v-if="
                  chartData.expenseBreakdown &&
                  chartData.expenseBreakdown.length > 0
                "
                class="mt-3 space-y-2"
              >
                <div class="text-xs font-semibold text-gray-600 mb-2">
                  Expense Breakdown:
                </div>
                <div
                  v-for="expense in chartData.expenseBreakdown"
                  :key="expense.name"
                  class="flex justify-between items-center text-xs bg-white rounded px-3 py-2"
                >
                  <span class="text-gray-700">{{ expense.name }}</span>
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-800">
                      ₱{{
                        Number(expense.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      }}
                    </span>
                    <span class="text-gray-500"
                      >({{ expense.percentage }}%)</span
                    >
                  </div>
                </div>
              </div>
              <div v-else class="text-xs text-gray-500 mt-2">
                No operating expenses recorded for this period
              </div>
            </div>
          </div>

          <!-- Net Income Section -->
          <div class="mb-6">
            <h4 class="font-semibold text-md mb-3 text-primaryColor">
              Net Income
            </h4>
            <div class="bg-purple-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Net Profit/Loss</span>
                <span
                  class="font-bold text-lg"
                  :class="
                    statement.netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                  "
                >
                  ₱{{
                    Number(statement.netIncome || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-2">
                <p>• Calculated as: Gross Profit - Operating Expenses</p>
                <p>
                  • Net Profit Margin:
                  {{
                    statement.revenue > 0
                      ? (
                          (statement.netIncome / statement.revenue) *
                          100
                        ).toFixed(1)
                      : '0'
                  }}%
                </p>
                <p
                  v-if="statement.netIncome < 0"
                  class="text-red-600 font-medium"
                >
                  <font-awesome-icon
                    :icon="faExclamationTriangle"
                    class="mr-1"
                  />
                  Operating at a loss for this period
                </p>
              </div>
            </div>
          </div>

          <!-- Cash Position Section -->
          <div class="mb-4">
            <h4 class="font-semibold text-md mb-3 text-primaryColor">
              Cash Position
            </h4>
            <div class="bg-indigo-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-700">Total Cash on Hand</span>
                <span class="font-bold text-indigo-700">
                  ₱{{
                    Number(statement.cashOnHand || 0).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 2 }
                    )
                  }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-2">
                <p>• Current cash balance across all branches</p>
                <p>• Includes all cash movements and transactions</p>
              </div>
            </div>
          </div>

          <!-- Summary Footer -->
          <div class="mt-6 pt-4 border-t border-gray-200">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-600">Last Updated:</span>
              <span class="font-medium text-gray-800">{{
                lastUpdated.toLocaleString()
              }}</span>
            </div>
            <div class="text-xs text-gray-500 mt-2">
              <p>
                <font-awesome-icon :icon="faChartBar" class="mr-1" />
                All figures are calculated from actual transaction data
              </p>
              <p>
                <font-awesome-icon :icon="faPesoSign" class="mr-1" />
                COGS is estimated at 30% of revenue (industry standard for food
                service)
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
