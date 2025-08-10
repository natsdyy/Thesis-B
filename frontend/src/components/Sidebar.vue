<template>
  <div class="h-screen flex">
    <!-- Sidebar -->
    <aside
      :class="[
        isMini ? 'w-20' : 'w-64',
        'bg-base-200 p-4 transition-all duration-300 flex flex-col fixed h-screen',
      ]"
    >
      <!-- Top: Logo + Toggle button -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <img src="/logo1.png" alt="Logo" class="w-8 h-8" />
          <span v-if="!isMini" class="font-bold text-lg">MyApp</span>
        </div>
        <button class="btn btn-sm btn-ghost" @click="isMini = !isMini">
          <span v-if="isMini">➡️</span>
          <span v-else>⬅️</span>
        </button>
      </div>

      <!-- Menu -->
      <ul class="menu bg-base-200 rounded-box mt-6 flex-1">
        <li>
          <a>
            <span>🏠</span>
            <span v-if="!isMini">Dashboard</span>
          </a>
        </li>
        <li>
          <a>
            <span>📦</span>
            <span v-if="!isMini">Products</span>
          </a>
        </li>
        <li>
          <a>
            <span>📊</span>
            <span v-if="!isMini">Reports</span>
          </a>
        </li>
        <li>
          <a>
            <span>⚙</span>
            <span v-if="!isMini">Settings</span>
          </a>
        </li>
      </ul>
    </aside>

    <!-- Main content -->
    <main
      class="flex-1 p-6 overflow-y-auto"
      :class="isMini ? 'ml-20' : 'ml-64'"
    >
      <UserManager />
    </main>
  </div>
</template>

<script setup>
  import UserManager from './UserManager.vue';
  import { ref } from 'vue';

  const isMini = ref(false);
</script>
