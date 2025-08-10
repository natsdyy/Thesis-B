<script setup>
  import { ref, onMounted } from 'vue';
  import UserManager from './components/UserManager.vue';
  import RoleManager from './components/RoleManager.vue';
  // Theme management
  const currentTheme = ref('light');
  const themes = ['light', 'dark'];

  const setTheme = (theme) => {
    currentTheme.value = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  onMounted(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  });
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-lg">
      <div class="navbar-start">
        <div class="dropdown">
          <label tabindex="0" class="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </label>
        </div>
        <div class="flex items-center space-x-3">
          <div class="avatar placeholder w-15 h-15">
            <img src="/logo1.png" alt="logo" />
          </div>
          <a class="text-xl font-bold">Countryside Steakhouse</a>
        </div>
      </div>

      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
          <li><a class="active">Dashboard</a></li>
          <li><a>Users</a></li>
          <li><a>Settings</a></li>
        </ul>
      </div>

      <div class="navbar-end">
        <!-- Theme Selector -->
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-ghost btn-circle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
              />
            </svg>
          </label>
          <ul
            tabindex="0"
            class="menu dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52 max-h-96 overflow-y-auto"
          >
            <li class="menu-title">
              <span>Choose Theme</span>
            </li>
            <li v-for="theme in themes" :key="theme">
              <a
                @click="setTheme(theme)"
                :class="{ active: currentTheme === theme }"
                class="capitalize"
              >
                {{ theme }}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Hero Section -->
    <!-- <div class="hero min-h-[40vh] bg-base-200">
      <div class="hero-content text-center">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold">Hello there! 👋</h1>
          <p class="py-6">
            Welcome to Thesis B - A full-stack application built with Vue.js,
            Express.js, PostgreSQL, Pinia, Tailwind CSS, and Daisy UI.
          </p>
          <div class="flex flex-wrap gap-2 justify-center">
            <div class="badge badge-primary">Vue 3</div>
            <div class="badge badge-secondary">Express.js</div>
            <div class="badge badge-accent">PostgreSQL</div>
            <div class="badge badge-neutral">Pinia</div>
            <div class="badge badge-info">Tailwind CSS</div>
            <div class="badge badge-success">Daisy UI</div>
          </div>
        </div>
      </div>
    </div> -->

    <!-- Main Content -->
    <main class="py-8">
      <RoleManager />
    </main>

    <!-- Footer -->
    <footer
      class="footer footer-center p-10 bg-base-300 text-base-content rounded"
    >
      <div class="grid grid-flow-col gap-4">
        <a class="link link-hover">About us</a>
        <a class="link link-hover">Contact</a>
        <a class="link link-hover">Jobs</a>
        <a class="link link-hover">Press kit</a>
      </div>
      <div>
        <div class="grid grid-flow-col gap-4">
          <a>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              class="fill-current"
            >
              <path
                d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"
              ></path>
            </svg>
          </a>
          <a>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              class="fill-current"
            >
              <path
                d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"
              ></path>
            </svg>
          </a>
          <a>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              class="fill-current"
            >
              <path
                d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
              ></path>
            </svg>
          </a>
        </div>
      </div>
      <div>
        <p>
          Copyright © 2024 - Thesis B - Built with ❤️ using Vue.js, Express.js
          & PostgreSQL
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
  /* Custom styles can be added here if needed */
</style>
