<script setup>
  import { ref } from 'vue';
  import { useAuthStore } from '../stores/authStore';
  import { useRouter } from 'vue-router';

  const authStore = useAuthStore();
  const router = useRouter();

  const selectedRole = ref('HR Manager');
  const roles = [
    { value: 'Super Admin', label: 'Super Admin' },
    { value: 'HR Manager', label: 'HR Manager' },
    { value: 'SCM Staff', label: 'SCM Staff' },
  ];

  const login = () => {
    authStore.setMockUser(selectedRole.value);
    router.push('/dashboard');
  };
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-100">
    <div class="card w-96 bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title justify-center">Login</h2>

        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Select Role</span>
          </label>
          <select v-model="selectedRole" class="select select-bordered w-full">
            <option v-for="role in roles" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
        </div>

        <div class="card-actions justify-end mt-6">
          <button @click="login" class="btn btn-primary w-full">Login</button>
        </div>
      </div>
    </div>
  </div>
</template>
