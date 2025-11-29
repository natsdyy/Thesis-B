<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useFeedbackStore } from '@/stores/feedbackStore';

  const feedbackStore = useFeedbackStore();

  const suggestions = ref([]);
  const loading = computed(() => feedbackStore.loading);

  const groupBy = (arr, keyFn) => {
    const map = new Map();
    for (const item of arr) {
      const key = keyFn(item);
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  };

  const buildSuggestionsFromFeedback = () => {
    const ratings = Array.isArray(feedbackStore.orderRatings)
      ? feedbackStore.orderRatings
      : [];

    // Flatten item-level ratings with created_at context
    const itemLevel = [];
    ratings.forEach((r) => {
      const when = new Date(r.created_at || r.updated_at || Date.now());
      const perItem = r?.item_ratings || {};
      Object.entries(perItem).forEach(([itemIdStr, obj]) => {
        const itemId = Number(itemIdStr);
        if (!Number.isFinite(itemId)) return;
        itemLevel.push({
          itemId,
          itemName: obj?.item_name || obj?.menu_item_name || `Item ${itemId}`,
          rating: Number(obj?.rating || 0),
          createdAt: when,
          comment: obj?.comment || '',
        });
      });
    });

    // Aggregate per item
    const perItem = groupBy(itemLevel, (x) => x.itemId);
    const out = [];
    const now = new Date();
    perItem.forEach((list, itemId) => {
      // Sort by date asc for trend windows
      list.sort((a, b) => a.createdAt - b.createdAt);
      const count = list.length;
      const sum = list.reduce((s, v) => s + (v.rating || 0), 0);
      const avg = count ? Math.round((sum / count) * 10) / 10 : 0;

      // Trend: compare last 7 vs previous 7 ratings averages
      const recent = list.slice(-7);
      const older = list.slice(-14, -7);
      const avgRecent = recent.length
        ? recent.reduce((s, v) => s + v.rating, 0) / recent.length
        : 0;
      const avgOlder = older.length
        ? older.reduce((s, v) => s + v.rating, 0) / older.length
        : avgRecent;
      const trendChange = avgOlder
        ? ((avgRecent - avgOlder) / avgOlder) * 100
        : 0;

      const negativeCount = list.filter((x) => x.rating <= 2).length;
      const positiveCount = list.filter((x) => x.rating >= 4).length;

      // Rules based on feedback only
      const base = {
        itemId,
        itemName: list[0]?.itemName || `Item ${itemId}`,
        ratingAvg: Math.round(avg * 10) / 10,
        ratingCount: count,
        trendChange: Math.round(trendChange),
      };

      // Priority list
      if (count >= 3 && (avg <= 3.0 || negativeCount / count >= 0.35)) {
        out.push({
          ...base,
          type: 'quality',
          priority: 'high',
          title: 'Quality Improvement Needed',
          reason: `Low average (${base.ratingAvg}/5) with ${negativeCount}/${count} low ratings`,
          recommendation:
            'Investigate root causes; pause promos until resolved',
          icon: 'fa-solid fa-exclamation-triangle',
          color: 'text-warning',
        });
        return; // Highest concern for this item
      }

      if (count >= 4 && avgRecent >= 4.5 && base.trendChange >= 10) {
        out.push({
          ...base,
          type: 'highlight',
          priority: 'medium',
          title: 'Customer Favorite Emerging',
          reason: `Excellent recent ratings (${avgRecent.toFixed(1)}/5, +${base.trendChange}% trend)`,
          recommendation: 'Feature in promos; consider bundles and upsells',
          icon: 'fa-solid fa-thumbs-up',
          color: 'text-success',
        });
        return;
      }

      if (count >= 4 && base.trendChange <= -15) {
        out.push({
          ...base,
          type: 'investigate',
          priority: 'medium',
          title: 'Rating Decline Detected',
          reason: `Recent ratings down by ${Math.abs(base.trendChange)}%`,
          recommendation:
            'Check consistency, preparation, and service feedback',
          icon: 'fa-solid fa-chart-line',
          color: 'text-error',
        });
        return;
      }

      if (positiveCount >= 3 && avg >= 4.2) {
        out.push({
          ...base,
          type: 'promote',
          priority: 'low',
          title: 'Promote Well-Loved Item',
          reason: `Solid feedback (${base.ratingAvg}/5 across ${count} ratings)`,
          recommendation: 'Light promo/feature to amplify demand',
          icon: 'fa-solid fa-bullseye',
          color: 'text-primaryColor',
        });
        return;
      }
    });

    // Order by priority then by ratingAvg desc
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    out.sort(
      (a, b) =>
        priorityOrder[b.priority] - priorityOrder[a.priority] ||
        b.ratingAvg - a.ratingAvg ||
        String(a.itemName).localeCompare(String(b.itemName))
    );
    suggestions.value = out;
  };

  const refresh = async () => {
    await feedbackStore.fetchOrderRatings({ limit: 200, offset: 0 });
    await feedbackStore.fetchOrderRatingStats();
    buildSuggestionsFromFeedback();
  };

  onMounted(async () => {
    await refresh();
  });
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6">
    <div class="mb-6 sm:mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
        Sales & Promo Analytics
      </h1>
      <p class="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
        Powered by Remitted Orders and Customer Feedback
      </p>
    </div>

    <!-- Intelligent Promo Suggestions (Feedback-Only) -->
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-700">
            Intelligent Promo Suggestions (from Customer Feedback)
          </h3>
          <button
            class="btn btn-xs bg-gray-100 text-gray-800 hover:bg-gray-200"
            @click="refresh"
            :disabled="loading"
          >
            Refresh
          </button>
        </div>

        <div v-if="loading" class="text-center py-8">
          <div
            class="loading loading-spinner loading-md text-primaryColor"
          ></div>
          <div class="text-sm text-gray-600 mt-2">Analyzing feedback...</div>
        </div>

        <div
          v-else-if="suggestions.length === 0"
          class="text-center py-8 text-gray-500"
        >
          No suggestions yet — not enough feedback.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="s in suggestions"
            :key="`${s.itemId}-${s.type}`"
            class="bg-white border rounded-lg p-4 border-l-4"
            :class="{
              'border-warning': s.priority === 'high',
              'border-error': s.type === 'investigate',
              'border-primaryColor': s.priority === 'medium',
              'border-warning ': s.priority === 'low',
            }"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="text-xs text-gray-500">{{ s.itemId }}</div>
                <h4 class="text-sm font-semibold text-gray-800">
                  {{ s.title }} — {{ s.itemName }}
                </h4>
                <div class="text-xs text-gray-600 mt-1">
                  {{ s.reason }} • Avg {{ s.ratingAvg }}/5 ({{ s.ratingCount }}
                  ratings)
                  <span v-if="Number.isFinite(s.trendChange)">
                    • Trend {{ s.trendChange }}%</span
                  >
                </div>
              </div>
              <div
                class="badge badge-xs"
                :class="{
                  'bg-warning/10 text-warning': s.priority === 'high',
                  'bg-error/10 text-error': s.type === 'investigate',
                  'bg-primaryColor/10 text-primaryColor':
                    s.priority === 'medium',
                  'bg-warning/10 text-warning': s.priority === 'low',
                }"
              >
                {{ s.priority.toUpperCase() }}
              </div>
            </div>
            <div class="mt-3 text-xs text-gray-800">
              Recommendation: {{ s.recommendation }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
