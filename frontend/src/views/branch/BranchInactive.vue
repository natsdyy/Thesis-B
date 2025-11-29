<script setup>
  import { Store, AlertCircle, Clock, MessageCircle } from 'lucide-vue-next';
  import { useAuthStore } from '../../stores/authStore';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { computed } from 'vue';

  const authStore = useAuthStore();
  const branchContextStore = useBranchContextStore();

  // Get current branch from context store
  const currentBranch = computed(() => branchContextStore.currentBranch);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200 px-4">
    <div class="text-center max-w-2xl mx-auto w-full">
      <!-- Branch Inactive Icon -->
      <div class="mb-8">
        <div class="flex justify-center mb-4">
          <div class="relative">
            <Store class="w-32 h-32 text-gray-400" />
            <AlertCircle
              class="w-12 h-12 text-warning absolute -bottom-2 -right-2 bg-base-200 rounded-full"
            />
          </div>
        </div>
        <h1 class="text-4xl font-bold text-base-content mb-2">
          Branch Not Yet Active
        </h1>
      </div>

      <!-- Branch Information -->
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-primaryColor">
          {{ currentBranch?.name || 'Your Branch' }}
        </h2>
        <div class="bg-base-100 rounded-lg p-6 mb-4 border-2 border-warning/30">
          <div class="flex items-start justify-center space-x-4 mb-4">
            <div
              class="flex-shrink-0 w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center"
            >
              <Clock class="w-6 h-6 text-warning" />
            </div>
            <div class="text-left">
              <p class="text-base-content/90 text-lg font-medium mb-2">
                We're Getting Ready for You!
              </p>
              <p class="text-base-content/70 mb-3">
                This branch is currently being set up and is not yet active for
                operations. Your access is limited until the branch becomes
                operational.
              </p>
            </div>
          </div>

          <div class="border-t border-base-300 pt-4 mt-4">
            <h3 class="text-sm font-semibold text-base-content/70 mb-3">
              What You Can Do:
            </h3>
            <ul class="text-sm text-base-content/60 space-y-2 text-left">
              <li class="flex items-start space-x-2">
                <MessageCircle
                  class="w-5 h-5 text-primaryColor flex-shrink-0 mt-0.5"
                />
                <span>
                  Contact your administrator or branch manager for updates on
                  when the branch will become active
                </span>
              </li>
              <li class="flex items-start space-x-2">
                <Store class="w-5 h-5 text-primaryColor flex-shrink-0 mt-0.5" />
                <span>
                  Access your profile to keep your information up to date
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <router-link
          to="/branch/profile"
          class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-thin"
        >
          <Store class="w-4 h-4 mr-2" />
          My Profile
        </router-link>
      </div>

      <!-- Branch Details -->
      <div
        v-if="currentBranch"
        class="mt-8 p-4 bg-base-100 rounded-lg border border-base-300"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
 
          <div class="text-left">
            <p class="text-base-content/60 font-medium">Location:</p>
            <p class="text-base-content font-semibold">
              {{ currentBranch.city }}, {{ currentBranch.state }}
            </p>
          </div>
          <div class="text-left md:col-span-2">
            <p class="text-base-content/60 font-medium">Address:</p>
            <p class="text-base-content font-semibold">
              {{ currentBranch.address }}
            </p>
          </div>
        </div>
      </div>

      <!-- User Info -->
      <div class="mt-8 p-4 bg-base-100 rounded-lg border border-base-300">
        <p class="text-sm text-base-content/60 mb-1">Logged in as:</p>
        <p class="text-base font-semibold text-base-content">
          {{ authStore.user?.first_name }} {{ authStore.user?.last_name }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Additional custom styles if needed */
</style>
