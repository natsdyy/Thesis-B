<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Announcement Management
      </h1>
      <p class="text-gray-600">
        Manage announcements and promotions displayed on the homepage
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Active Announcements</div>
        <div class="stat-value text-success">
          {{ stats.active_announcements }}
        </div>
      </div>
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Inactive Announcements</div>
        <div class="stat-value text-warning">
          {{ stats.inactive_announcements }}
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex-1">
        <div class="form-control">
          <div class="input-group flex">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search announcements..."
              class="input input-bordered flex-1"
            />
            <button class="btn btn-square" @click="loadAnnouncements">
              <Search :size="20" />
            </button>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="btn text-white hover:opacity-90 active:opacity-80 font-thin"
          style="
            background-color: var(--color-primaryColor);
            border-color: var(--color-primaryColor);
          "
          @click="openCreateModal"
          v-if="!isViewOnly"
        >
          <Plus :size="20" class="mr-2" />
          Add Announcement
        </button>
        <button
          class="btn btn-ghost"
          @click="loadAnnouncements"
          :disabled="loading"
        >
          <RefreshCw :size="20" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Announcements Cards -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div
      v-else-if="!loading && filteredAnnouncements.length === 0"
      class="text-center py-12 text-gray-500"
    >
      No announcements found
    </div>

    <div v-else class="space-y-4">
      <!-- Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="announcement in paginatedAnnouncements"
          :key="announcement.id"
          class="card bg-base-100 shadow hover:shadow-lg transition-shadow"
          @click="openViewModal(announcement)"
        >
          <div class="card-body">
            <div class="flex items-start justify-between mb-2">
              <h2 class="card-title text-lg flex-1">
                {{ announcement.title }}
              </h2>
              <span
                :class="[
                  'badge badge-sm',
                  announcement.is_active
                    ? 'bg-success/20 text-success font-medium'
                    : 'bg-warning/20 text-warning font-medium',
                ]"
              >
                {{ announcement.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <p v-if="announcement.subtitle" class="text-sm text-gray-600 mb-3">
              {{ announcement.subtitle }}
            </p>

            <div class="flex flex-wrap gap-2 mb-3">
              <span class="badge badge-sm bg-info/20 text-info font-medium">
                {{ formatAnnouncementType(announcement.announcement_type) }}
              </span>
              <span
                class="badge badge-sm bg-secondary/20 text-secondary font-medium"
              >
                {{ formatContentFormat(announcement.content_format) }}
              </span>
            </div>

            <div class="space-y-1 text-xs text-gray-500 mb-4">
              <div class="flex items-center gap-2">
                <span class="font-medium">Valid From:</span>
                <span>{{ formatDate(announcement.valid_from) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">Valid Until:</span>
                <span v-if="announcement.valid_until">
                  {{ formatDate(announcement.valid_until) }}
                </span>
                <span v-else class="text-gray-400">No expiration</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-medium">Display Order:</span>
                <span>#{{ announcement.display_order }}</span>
              </div>
            </div>

            <div
              class="card-actions justify-end mt-auto pt-4 border-t border-gray-200"
            >
              <button
                class="btn btn-sm btn-ghost"
                @click.stop="openEditModal(announcement)"
                title="Edit"
                v-if="!isViewOnly"
              >
                <Edit :size="16" />
                <span class="ml-1">Edit</span>
              </button>
              <button
                class="btn btn-sm btn-ghost text-error"
                @click.stop="confirmDelete(announcement)"
                title="Delete"
                v-if="!isViewOnly"
              >
                <Trash2 :size="16" />
                <span class="ml-1">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="filteredAnnouncements.length > 0"
        class="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div class="text-sm text-gray-600">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{
            Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)
          }}
          of {{ filteredAnnouncements.length }} announcements
        </div>
        <div class="join">
          <button
            class="join-item btn btn-sm"
            :class="{ 'btn-disabled': currentPage === 1 }"
            @click="setPage(currentPage - 1)"
            :disabled="currentPage === 1"
          >
            «
          </button>
          <button
            v-for="page in totalPages"
            :key="page"
            class="join-item btn btn-sm"
            :class="{ 'btn-active': currentPage === page }"
            @click="setPage(page)"
          >
            {{ page }}
          </button>
          <button
            class="join-item btn btn-sm"
            :class="{ 'btn-disabled': currentPage === totalPages }"
            @click="setPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
          >
            »
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <AnnouncementFormModal
      :isOpen="isFormModalOpen"
      :announcement="editingAnnouncement"
      :saving="saving"
      @close="closeModal"
      @submit="handleFormSubmit"
    />

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModal" class="modal" v-if="!isViewOnly">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Announcement</h3>
        <p class="mb-4">
          Are you sure you want to delete this announcement? This action cannot
          be undone.
        </p>
        <div class="bg-base-200 p-4 rounded mb-4">
          <p class="font-medium">{{ deletingAnnouncement?.title }}</p>
        </div>
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" @click="closeDeleteModal">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-error"
            @click="deleteAnnouncement"
            :disabled="saving"
          >
            <span v-if="saving" class="loading loading-spinner"></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteModal">close</button>
      </form>
    </dialog>

    <!-- View Modal -->
    <AnnouncementModal
      :isOpen="isViewModalOpen"
      :announcements="viewAnnouncements"
      @close="closeViewModal"
    />

    <!-- Toast -->
    <div
      v-if="toast.show"
      :class="[
        'toast toast-top toast-end',
        toast.type === 'success' ? 'alert-success' : 'alert-error',
      ]"
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  import { Plus, Search, RefreshCw, Edit, Trash2 } from 'lucide-vue-next';
  import announcementService from '../../services/announcementService.js';
  import { apiConfig } from '../../config/api.js';
  import AnnouncementFormModal from '../../components/crm/AnnouncementFormModal.vue';
  import AnnouncementModal from '../../components/crm/AnnouncementModal.vue';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';

  const { showSuccess, showError } = useCustomToast();

  const announcements = ref([]);
  const loading = ref(false);
  const saving = ref(false);
  const searchQuery = ref('');
  const currentPage = ref(1);
  const itemsPerPage = 10;
  const deleteModal = ref(null);
  const editingAnnouncement = ref(null);
  const deletingAnnouncement = ref(null);
  const isFormModalOpen = ref(false);
  const isViewModalOpen = ref(false);
  const viewAnnouncements = ref([]);

  const toast = ref({
    show: false,
    message: '',
    type: 'success',
  });

  // Role-based view-only flag
  const authStore = useAuthStore();
  const { user } = storeToRefs(authStore);
  const isViewOnly = computed(() => {
    const role = user.value?.role || user.value?.position || '';
    return role === 'Chairman of the Board';
  });

  const stats = computed(() => {
    const active = announcements.value.filter((a) => a.is_active).length;
    const inactive = announcements.value.filter((a) => !a.is_active).length;
    return {
      active_announcements: active,
      inactive_announcements: inactive,
      total_announcements: announcements.value.length,
    };
  });

  const filteredAnnouncements = computed(() => {
    if (!searchQuery.value) return announcements.value;
    const query = searchQuery.value.toLowerCase();
    return announcements.value.filter(
      (announcement) =>
        announcement.title.toLowerCase().includes(query) ||
        (announcement.subtitle &&
          announcement.subtitle.toLowerCase().includes(query)) ||
        (announcement.description &&
          announcement.description.toLowerCase().includes(query))
    );
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredAnnouncements.value.length / itemsPerPage);
  });

  const paginatedAnnouncements = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAnnouncements.value.slice(start, end);
  });

  const loadAnnouncements = async () => {
    try {
      loading.value = true;
      const token = localStorage.getItem('token');
      const apiUrl = apiConfig.baseURL || import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to load announcements';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      announcements.value = data.data || [];
      currentPage.value = 1;
    } catch (error) {
      console.error('Error loading announcements:', error);
      showError(error.message || 'Failed to load announcements');
    } finally {
      loading.value = false;
    }
  };

  const openCreateModal = () => {
    editingAnnouncement.value = null;
    isFormModalOpen.value = true;
  };

  const openEditModal = (announcement) => {
    editingAnnouncement.value = announcement;
    isFormModalOpen.value = true;
  };

  const closeModal = () => {
    isFormModalOpen.value = false;
    editingAnnouncement.value = null;
  };

  const openViewModal = (announcement) => {
    viewAnnouncements.value = [announcement];
    isViewModalOpen.value = true;
  };

  const closeViewModal = () => {
    isViewModalOpen.value = false;
    viewAnnouncements.value = [];
  };

  const handleFormSubmit = async (formData) => {
    try {
      saving.value = true;
      const token = localStorage.getItem('token');
      const apiUrl = apiConfig.baseURL || import.meta.env.VITE_API_URL || '';
      const endpoint = editingAnnouncement.value
        ? `/announcements/${editingAnnouncement.value.id}`
        : '/announcements';
      const url = `${apiUrl}${endpoint}`;
      const method = editingAnnouncement.value ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to save announcement';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Backend error response:', errorData);
        } catch {
          errorMessage = errorText || errorMessage;
          console.error('Backend error text:', errorText);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      showSuccess(
        editingAnnouncement.value
          ? 'Announcement updated successfully'
          : 'Announcement created successfully'
      );
      closeModal();
      await loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      showError(error.message || 'Failed to save announcement');
    } finally {
      saving.value = false;
    }
  };

  const confirmDelete = (announcement) => {
    deletingAnnouncement.value = announcement;
    deleteModal.value?.showModal();
  };

  const closeDeleteModal = () => {
    deleteModal.value?.close();
    deletingAnnouncement.value = null;
  };

  const deleteAnnouncement = async () => {
    try {
      saving.value = true;
      const token = localStorage.getItem('token');
      const apiUrl = apiConfig.baseURL || import.meta.env.VITE_API_URL || '';
      const response = await fetch(
        `${apiUrl}/announcements/${deletingAnnouncement.value.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete announcement';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      showSuccess('Announcement deleted successfully');
      closeDeleteModal();
      await loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError(error.message || 'Failed to delete announcement');
    } finally {
      saving.value = false;
    }
  };

  const setPage = (page) => {
    currentPage.value = page;
  };

  const truncate = (str, length) => {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatAnnouncementType = (type) => {
    if (!type) return 'N/A';
    const types = {
      promotional: 'Promotional',
      new_feature: 'New Feature',
      event: 'Event',
      job_hiring: 'Job Hiring',
      simple_text: 'Simple Text',
      promotional_banner: 'Promo Banner',
    };
    return types[type] || type;
  };

  const formatContentFormat = (format) => {
    if (!format) return 'N/A';
    const formats = {
      all: 'Text, Image and Video',
      text_image: 'Text and Image',
      video_text: 'Video and Text',
      text_only: 'Text Only',
      image_only: 'Image Only',
      video_only: 'Video Only',
    };
    return formats[format] || format;
  };

  const showToast = (message, type = 'success') => {
    const normalizedType = (type || 'success').toLowerCase();
    if (normalizedType === 'error') {
      showError(message);
    } else if (normalizedType === 'success') {
      showSuccess(message);
    } else {
      showSuccess(message);
    }
  };

  onMounted(() => {
    loadAnnouncements();
  });
</script>

<style scoped></style>
