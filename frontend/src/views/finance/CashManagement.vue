<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useBranchStore } from '../../stores/branchStore';
  import { useCustomToast } from '../../composables/useCustomToast.js';

  // Stub child components
  import CashMovement from '../../components/finance/CashMovement.vue';
  import CurrentBalance from '../../components/finance/CurrentBalance.vue';
  import OtherExpenses from '../../components/finance/OtherExpenses.vue';

  const branchContext = useBranchContextStore();
  const branchStore = useBranchStore();
  const { showToast } = useCustomToast();

  const activeTab = ref('movement'); // movement | balance | other expenses

  const isSuperAdmin = computed(() => branchContext.isSuperAdmin);
  const availableBranches = computed(
    () => branchContext.availableBranches || []
  );
  const currentBranch = computed(() => branchContext.currentBranch);
  const selectedBranchId = ref(null);

  const displayBranches = computed(() => {
    const ctxList = availableBranches.value || [];
    if (Array.isArray(ctxList) && ctxList.length) return ctxList;
    const activeList = branchStore.activeBranches || [];
    if (Array.isArray(activeList) && activeList.length) return activeList;
    return currentBranch.value ? [currentBranch.value] : [];
  });

  const initialize = async () => {
    try {
      if (!currentBranch.value) {
        await branchContext.initializeBranchContext();
      }
      selectedBranchId.value = currentBranch.value?.id ?? null;
      if (
        (availableBranches.value?.length || 0) === 0 &&
        branchContext.isSuperAdmin
      ) {
        await branchStore.fetchActiveBranches();
      }
    } catch (err) {
      console.error('Init cash management failed', err);
      showToast('Failed to initialize cash management', 'error');
    }
  };

  const onSelectBranch = async (e) => {
    selectedBranchId.value = Number(e.target.value) || 0;
  };

  onMounted(() => {
    initialize();
  });
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 justify-between items-center"
    >
      <div>
        <h1 class="text-2xl font-bold text-primaryColor">Cash Management</h1>
        <p class="text-sm text-gray-600">
          Manage cash movements, balances, and forecasting
        </p>
      </div>
    </div>

    <div class="tabs tabs-boxed w-full">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'movement' }"
        @click="activeTab = 'movement'"
      >
        <font-awesome-icon icon="fa-solid fa-right-left" class="mr-2" />
        Cash Movement
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'balance' }"
        @click="activeTab = 'balance'"
      >
        <font-awesome-icon icon="fa-solid fa-wallet" class="mr-2" />
        Current Balance
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'other expenses' }"
        @click="activeTab = 'other expenses'"
      >
        <font-awesome-icon icon="fa-solid fa-receipt" class="mr-2" />
        Other Expenses
      </a>
    </div>

    <div v-show="activeTab === 'movement'">
      <CashMovement :branch-id="selectedBranchId || currentBranch?.id || 0" />
    </div>
    <div v-show="activeTab === 'balance'">
      <CurrentBalance :branch-id="selectedBranchId || currentBranch?.id || 0" />
    </div>
    <div v-show="activeTab === 'other expenses'">
      <OtherExpenses :branch-id="selectedBranchId || currentBranch?.id || 0" />
    </div>
  </div>
</template>

<style scoped></style>
