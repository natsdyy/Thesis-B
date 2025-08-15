<script setup>
  import { Home } from 'lucide-vue-next';
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-primaryColor">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-accentColor">404</h1>
      <h2 class="text-2xl font-semibold mt-4">Page Not Found</h2>
      <p class="text-base-content/70 mt-2">
        The page you're looking for doesn't exist.
      </p>
      <RouterLink
        to="/dashboard"
        class="btn bg-white text-primaryColor border border-none hover:bg-white/80 mt-6"
      >
        <Home class="w-4 h-4 mr-2" />
        Go Home
      </RouterLink>
    </div>
  </div>
</template>
