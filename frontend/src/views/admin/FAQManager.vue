<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">FAQ Management</h1>
      <p class="text-gray-600">Manage frequently asked questions</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Active FAQs</div>
        <div class="stat-value text-success">{{ stats.active_faqs }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Inactive FAQs</div>
        <div class="stat-value text-warning">{{ stats.inactive_faqs }}</div>
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
              placeholder="Search FAQs..."
              class="input input-bordered flex-1"
            />
            <button class="btn btn-square" @click="loadFAQs">
              <Search :size="20" />
            </button>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn text-white hover:opacity-90 active:opacity-80 font-thin" style="background-color: var(--color-primaryColor); border-color: var(--color-primaryColor);" @click="openCreateModal">
          <Plus :size="20" class="mr-2" />
          Add FAQ
        </button>
        <button class="btn btn-ghost" @click="loadFAQs" :disabled="loading">
          <RefreshCw :size="20" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- FAQ Tables - Active and Inactive -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Inactive FAQs Table (Left) -->
      <div class="card bg-base-100 shadow">
        <div class="card-body p-0">
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-700">Inactive FAQs</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th class="w-12"></th>
                  <th class="w-16">Order</th>
                  <th>Question</th>
                  <th>Category</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody ref="inactiveTbody">
                <tr v-if="loading">
                  <td colspan="6" class="text-center py-8">
                    <span class="loading loading-spinner loading-lg"></span>
                  </td>
                </tr>
                <!-- Placeholder row for empty table - must be a real DOM element -->
                <tr v-if="!loading && inactiveFAQs.length === 0" :data-id="'placeholder-inactive'" class="sortable-placeholder" style="height: 0.1px; line-height: 0.1px; font-size: 0; visibility: hidden; overflow: hidden;">
                  <td colspan="6" style="padding: 0; height: 0.1px; border: none;"></td>
                </tr>
                <tr v-if="!loading && inactiveFAQs.length === 0" class="no-drag">
                  <td colspan="6" class="text-center py-8 text-gray-500">
                    No inactive FAQs (drag FAQs here to make them inactive)
                  </td>
                </tr>
                <tr v-for="faq in paginatedInactiveFAQs" :key="faq.id" :data-id="faq.id" class="cursor-move faq-row">
                  <td class="w-12">
                    <div class="flex items-center justify-center text-gray-400 hover:text-gray-600 drag-handle" style="cursor: grab; padding: 8px;">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  </td>
                  <td class="w-16">
                    <span class="badge bg-gray-200 badge-sm">{{ faq.display_order || '-' }}</span>
                  </td>
                  <td>
                    <div class="font-medium">{{ truncate(faq.question, 50) }}</div>
                  </td>
                  <td>
                    <span v-if="faq.category" class="badge badge-sm  border-gray-300">
                      {{ faq.category }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td>{{ formatDate(faq.created_at) }}</td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-sm btn-ghost"
                        @click.stop="openEditModal(faq)"
                        title="Edit"
                        type="button"
                      >
                        <Edit :size="16" />
                      </button>
                      <button
                        class="btn btn-sm btn-ghost text-error"
                        @click.stop="confirmDelete(faq)"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination for Inactive FAQs -->
          <div v-if="!loading && inactiveFAQs.length > 0" class="p-4 border-t border-gray-200 flex items-center justify-between">
            <div class="text-sm text-gray-600">
              Showing {{ (inactivePage - 1) * itemsPerPage + 1 }} to {{ Math.min(inactivePage * itemsPerPage, inactiveFAQs.length) }} of {{ inactiveFAQs.length }} FAQs
            </div>
            <div class="join">
              <button
                class="join-item btn btn-sm"
                :class="{ 'btn-disabled': inactivePage === 1 }"
                @click="setInactivePage(inactivePage - 1)"
                :disabled="inactivePage === 1"
              >
                «
              </button>
              <button
                v-for="page in inactiveTotalPages"
                :key="page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': inactivePage === page }"
                @click="setInactivePage(page)"
              >
                {{ page }}
              </button>
              <button
                class="join-item btn btn-sm"
                :class="{ 'btn-disabled': inactivePage === inactiveTotalPages }"
                @click="setInactivePage(inactivePage + 1)"
                :disabled="inactivePage === inactiveTotalPages"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Active FAQs Table (Right) -->
      <div class="card bg-base-100 shadow">
        <div class="card-body p-0">
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-gray-700">Active FAQs</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th class="w-12"></th>
                  <th class="w-16">Order</th>
                  <th>Question</th>
                  <th>Category</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody ref="activeTbody">
                <tr v-if="loading">
                  <td colspan="6" class="text-center py-8">
                    <span class="loading loading-spinner loading-lg"></span>
                  </td>
                </tr>
                <!-- Placeholder row for empty table - must be a real DOM element -->
                <tr v-if="!loading && activeFAQs.length === 0" :data-id="'placeholder-active'" class="sortable-placeholder" style="height: 0.1px; line-height: 0.1px; font-size: 0; visibility: hidden; overflow: hidden;">
                  <td colspan="6" style="padding: 0; height: 0.1px; border: none;"></td>
                </tr>
                <tr v-if="!loading && activeFAQs.length === 0" class="no-drag">
                  <td colspan="6" class="text-center py-8 text-gray-500">
                    No active FAQs (drag FAQs here to make them active)
                  </td>
                </tr>
                <tr v-for="faq in paginatedActiveFAQs" :key="faq.id" :data-id="faq.id" class="cursor-move faq-row">
                  <td class="w-12">
                    <div class="flex items-center justify-center text-gray-400 hover:text-gray-600 drag-handle" style="cursor: grab; padding: 8px;">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  </td>
                  <td class="w-16">
                    <span class="badge bg-success/10 text-success badge-sm font-medium">{{ faq.display_order || '-' }}</span>
                  </td>
                  <td>
                    <div class="font-medium">{{ truncate(faq.question, 50) }}</div>
                  </td>
                  <td>
                    <span v-if="faq.category" class="badge  badge-sm border-gray-300">
                      {{ faq.category }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td>{{ formatDate(faq.created_at) }}</td>
                  <td>
                    <div class="flex gap-2">
                      <button
                        class="btn btn-sm btn-ghost"
                        @click.stop="openEditModal(faq)"
                        title="Edit"
                        type="button"
                      >
                        <Edit :size="16" />
                      </button>
                      <button
                        class="btn btn-sm btn-ghost text-error"
                        @click.stop="confirmDelete(faq)"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination for Active FAQs -->
          <div v-if="!loading && activeFAQs.length > 0" class="p-4 border-t border-gray-200 flex items-center justify-between">
            <div class="text-sm text-gray-600">
              Showing {{ (activePage - 1) * itemsPerPage + 1 }} to {{ Math.min(activePage * itemsPerPage, activeFAQs.length) }} of {{ activeFAQs.length }} FAQs
            </div>
            <div class="join">
              <button
                class="join-item btn btn-sm"
                :class="{ 'btn-disabled': activePage === 1 }"
                @click="setActivePage(activePage - 1)"
                :disabled="activePage === 1"
              >
                «
              </button>
              <button
                v-for="page in activeTotalPages"
                :key="page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': activePage === page }"
                @click="setActivePage(page)"
              >
                {{ page }}
              </button>
              <button
                class="join-item btn btn-sm"
                :class="{ 'btn-disabled': activePage === activeTotalPages }"
                @click="setActivePage(activePage + 1)"
                :disabled="activePage === activeTotalPages"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog ref="faqModal" class="modal">
      <div class="modal-box max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
          <h3 class="font-bold text-xl text-gray-900">
            {{ editingFAQ ? 'Edit FAQ' : 'Create New FAQ' }}
          </h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            @click="closeModal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveFAQ" class="flex flex-col gap-4">
          <div class="flex flex-col gap-4">
            <div class="form-control flex flex-col gap-2">
              <label class="label min-h-[1.5rem] pb-1 flex items-center">
                <span class="label-text font-semibold text-gray-700"
                  >Question *</span
                >
              </label>
              <textarea
                v-model="faqForm.question"
                class="textarea textarea-bordered min-h-[5rem] w-full"
                placeholder="Enter your question here..."
                required
              ></textarea>
            </div>

            <div class="form-control flex flex-col gap-2">
              <label class="label min-h-[1.5rem] pb-1 flex items-center">
                <span class="label-text font-semibold text-gray-700"
                  >Answer *</span
                >
              </label>
              <textarea
                v-model="faqForm.answer"
                class="textarea textarea-bordered min-h-[6rem] w-full"
                placeholder="Enter a detailed answer..."
                required
              ></textarea>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div class="form-control flex flex-col h-full">
                <label class="label min-h-[1.75rem] pb-2 pt-0 mb-0 flex items-center">
                  <span class="label-text font-semibold text-gray-700"
                    >Category</span
                  >
                </label>
                <div class="relative h-[2.75rem]">
                  <div
                    v-if="categoryIconSuggestion"
                    class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center"
                  >
                    <component
                      :is="categoryIconSuggestion"
                      :size="20"
                      class="text-gray-500"
                    />
                  </div>
                  <input
                    v-model="faqForm.category"
                    type="text"
                    class="input input-bordered w-full h-[2.75rem] min-h-[2.75rem]"
                    :class="{ 'pl-12': categoryIconSuggestion }"
                    placeholder="e.g., General, Orders, Payment"
                    @input="handleCategoryInput"
                  />
                </div>
                <label class="label min-h-[1.5rem] pt-1.5 pb-0 mt-0 flex items-start">
                  <span
                    v-if="categoryIconSuggestion"
                    class="label-text-alt text-gray-500 flex items-center gap-1"
                  >
                    Suggested icon:
                    <component
                      :is="categoryIconSuggestion"
                      :size="16"
                      class="text-primaryColor"
                    />
                  </span>
                </label>
              </div>

            </div>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              @click="closeModal"
              :disabled="saving"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn text-white btn-sm bg-primaryColor hover:opacity-90 active:opacity-80 font-thin"
              style="background-color: var(--color-primaryColor); border-color: var(--color-primaryColor);"
              :disabled="saving"
            >
              <span v-if="saving" class="loading loading-spinner loading-sm"></span>
              <span v-else>{{ editingFAQ ? 'Update FAQ' : 'Create FAQ' }}</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete FAQ</h3>
        <p class="mb-4">
          Are you sure you want to delete this FAQ? This action cannot be
          undone.
        </p>
        <div class="bg-base-200 p-4 rounded mb-4">
          <p class="font-medium">{{ deletingFAQ?.question }}</p>
        </div>
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-error"
            @click="deleteFAQ"
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
  import { ref, onMounted, computed, nextTick } from 'vue';
  import Sortable from 'sortablejs';
  import {
    Plus,
    Search,
    RefreshCw,
    Edit,
    Trash2,
    ClipboardList,
    Info,
    HelpCircle,
    Package,
    Truck,
    Store,
    CreditCard,
    DollarSign,
    Clock,
    Calendar,
    MapPin,
    Building2,
    Briefcase,
    Users,
    Star,
    MessageSquare,
    UtensilsCrossed,
    BookOpen,
    Pizza,
    Handshake,
    Phone,
    User,
    FileText,
    Shield,
    Tag,
    // Additional useful icons
    AlertCircle,
    CheckCircle,
    Settings,
    ShoppingCart,
    Gift,
    Receipt,
    Wallet,
    Coins,
    Mail,
    Bell,
    Heart,
    Award,
    Trophy,
    Lightbulb,
    Home,
    Coffee,
    ChefHat,
    ShoppingBag,
    Box,
    Archive,
    Folder,
    QrCode,
    BarChart3,
    Target,
    UserPlus,
    Sparkles,
    Percent,
    XCircle,
    Unlock,
    Lock,
    Eye,
    EyeOff,
    Link,
    ArrowLeft,
    ArrowRight,
    Play,
    Pause,
    Zap,
    SkipForward,
    Rocket,
    Fingerprint,
    List,
    X,
  } from 'lucide-vue-next';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';

  const loading = ref(false);
  const saving = ref(false);
  const faqs = ref([]);
  const categories = ref([]);
  const stats = ref({
    total_faqs: 0,
    active_faqs: 0,
    inactive_faqs: 0,
    total_categories: 0,
  });

  const searchQuery = ref('');
  const faqModal = ref(null);
  const deleteModal = ref(null);
  const editingFAQ = ref(null);
  const deletingFAQ = ref(null);

  const faqForm = ref({
    question: '',
    answer: '',
    category: '',
  });

  const toast = ref({ show: false, type: 'success', message: '' });
  const categoryIconSuggestion = ref(null);

  // Icon suggestion mapping based on category keywords
  const getCategoryIcon = (category) => {
    if (!category || !category.trim()) return null;
    
    const categoryLower = category.toLowerCase().trim();
    
    // Icon mapping based on keywords - Expanded with many more categories
    const iconMap = {
      // General categories
      general: ClipboardList,
      'general info': ClipboardList,
      information: Info,
      info: Info,
      help: HelpCircle,
      faq: HelpCircle,
      question: HelpCircle,
      questions: HelpCircle,
      
      // Orders and delivery
      order: Package,
      orders: Package,
      ordering: Package,
      delivery: Truck,
      shipping: Truck,
      ship: Truck,
      pickup: Store,
      takeout: Store,
      carryout: Store,
      
      // Payment
      payment: CreditCard,
      payments: CreditCard,
      pay: CreditCard,
      pricing: DollarSign,
      price: DollarSign,
      cost: DollarSign,
      money: Wallet,
      wallet: Wallet,
      receipt: Receipt,
      refund: RefreshCw,
      return: RefreshCw,
      returns: RefreshCw,
      
      // Hours and location
      hours: Clock,
      'operating hours': Clock,
      time: Clock,
      schedule: Calendar,
      calendar: Calendar,
      location: MapPin,
      address: MapPin,
      branch: Building2,
      branches: Building2,
      store: Store,
      stores: Store,
      shop: Store,
      
      // Hiring and careers
      hiring: Briefcase,
      career: Briefcase,
      careers: Briefcase,
      jobs: Briefcase,
      job: Briefcase,
      employment: Briefcase,
      apply: Users,
      join: Users,
      application: Briefcase,
      
      // Ratings and reviews
      rating: Star,
      ratings: Star,
      rate: Star,
      review: Star,
      reviews: Star,
      feedback: MessageSquare,
      testimonials: MessageSquare,
      comments: MessageSquare,
      
      // Food and menu
      food: UtensilsCrossed,
      menu: BookOpen,
      'menu items': BookOpen,
      product: Pizza,
      products: Pizza,
      item: ShoppingCart,
      items: ShoppingCart,
      dish: UtensilsCrossed,
      dishes: UtensilsCrossed,
      
      // Service
      service: Handshake,
      services: Handshake,
      support: HelpCircle,
      contact: Phone,
      phone: Phone,
      call: Phone,
      customer: User,
      customers: Users,
      client: User,
      
      // Policies
      policy: FileText,
      policies: FileText,
      terms: FileText,
      privacy: Shield,
      security: Shield,
      safety: Shield,
      warranty: FileText,
      
      // Additional categories
      discount: Percent,
      sale: ShoppingBag,
      promo: Gift,
      promotion: Gift,
      special: Sparkles,
      offer: Gift,
      account: User,
      profile: User,
      login: User,
      register: UserPlus,
      signup: UserPlus,
      membership: Award,
      loyalty: Trophy,
      rewards: Award,
      points: Target,
      bonus: Gift,
      news: Bell,
      updates: Bell,
      announcement: Bell,
      event: Calendar,
      events: Calendar,
      reservation: Calendar,
      booking: Calendar,
      table: UtensilsCrossed,
      party: Users,
      catering: ChefHat,
      private: Shield,
      corporate: Building2,
      bulk: ShoppingBag,
      wholesale: ShoppingBag,
      giftcard: Gift,
      card: CreditCard,
      online: QrCode,
      website: QrCode,
      app: ShoppingCart,
      mobile: ShoppingCart,
      tech: Settings,
      technical: Settings,
      quality: Award,
      complaint: AlertCircle,
      issue: AlertCircle,
      problem: AlertCircle,
      error: XCircle,
      success: CheckCircle,
      confirmation: CheckCircle,
      
      // More categories for expanded options
      nutrition: Heart,
      healthy: Heart,
      ingredients: UtensilsCrossed,
      allergen: AlertCircle,
      allergy: AlertCircle,
      preparation: ChefHat,
      cooking: ChefHat,
      custom: Sparkles,
      customization: Sparkles,
      specialrequest: Sparkles,
      catering: ChefHat,
      bulkorder: ShoppingBag,
      partyorder: Users,
      birthday: Gift,
      celebration: Gift,
      corporateevent: Building2,
      mealtray: UtensilsCrossed,
      combomeal: UtensilsCrossed,
      kidsmeal: Users,
      family: Users,
      group: Users,
      largeorder: ShoppingBag,
      minimumorder: ShoppingBag,
      tracking: Truck,
      status: Clock,
      estimatedtime: Clock,
      eta: Clock,
      processing: Settings,
      preparing: ChefHat,
      ready: CheckCircle,
      outfordelivery: Truck,
      delivered: CheckCircle,
      cancelled: XCircle,
      modification: Edit,
      changes: Edit,
      specialinstructions: FileText,
      note: FileText,
      deliveryfee: DollarSign,
      servicecharge: DollarSign,
      minimumamount: DollarSign,
      free: Gift,
      complimentary: Gift,
      samples: Gift,
      trial: Gift,
      firstorder: Gift,
      referral: Users,
      friend: Users,
      share: ShoppingCart,
      socialmedia: MessageSquare,
      facebook: MessageSquare,
      instagram: MessageSquare,
      twitter: MessageSquare,
      youtube: MessageSquare,
      tiktok: MessageSquare,
      newsletter: Mail,
      subscribe: Mail,
      unsubscribe: Mail,
      marketing: Target,
      promotion: Gift,
      seasonal: Calendar,
      holiday: Calendar,
      limitedtime: Clock,
      exclusive: Sparkles,
      new: Sparkles,
      featured: Star,
      popular: Star,
      recommended: Star,
      bestseller: Trophy,
      top: Trophy,
      trending: BarChart3,
      viral: MessageSquare,
      franchise: Building2,
      location: MapPin,
      branchlocator: MapPin,
      storefinder: MapPin,
      near: MapPin,
      nearby: MapPin,
      directions: MapPin,
      parking: MapPin,
      accessibility: User,
      wheelchair: User,
      facilities: Building2,
      wifi: ShoppingCart,
      restroom: User,
      atm: CreditCard,
      partnership: Handshake,
      collaboration: Handshake,
      sponsorship: Handshake,
      media: MessageSquare,
      press: FileText,
      interview: Phone,
      inquiry: HelpCircle,
      suggestion: Lightbulb,
      feedbackform: MessageSquare,
      survey: FileText,
      poll: BarChart3,
      vote: Target,
      contest: Trophy,
      giveaway: Gift,
      sweepstakes: Gift,
      prize: Trophy,
      winner: Trophy,
      rules: FileText,
      termsandconditions: FileText,
      termsofservice: FileText,
      privacypolicy: Shield,
      dataprotection: Shield,
      gdpr: Shield,
      cookie: FileText,
      cookies: FileText,
      disclaimer: FileText,
      legal: FileText,
      compliance: CheckCircle,
      accessibilitypolicy: User,
      sitemap: MapPin,
      careers: Briefcase,
      jobopenings: Briefcase,
      positions: Briefcase,
      opportunities: Briefcase,
      benefits: Award,
      compensation: DollarSign,
      salary: DollarSign,
      applicationprocess: FileText,
      interviewprocess: Phone,
      onboarding: UserPlus,
      training: BookOpen,
      development: Target,
      growth: Target,
      culture: Users,
      values: Heart,
      mission: Target,
      vision: Target,
      history: BookOpen,
      story: BookOpen,
      about: Info,
      company: Building2,
      team: Users,
      leadership: Users,
      founders: User,
      management: Users,
      board: Users,
      investors: DollarSign,
      funding: DollarSign,
      partners: Handshake,
      suppliers: Truck,
      vendors: ShoppingBag,
      logistics: Truck,
      distribution: Truck,
      warehouse: Building2,
      inventory: Package,
      stock: Package,
      availability: CheckCircle,
      outofstock: XCircle,
      backorder: Package,
      preorder: Calendar,
      launch: Sparkles,
      newproduct: Sparkles,
      limitededition: Sparkles,
      collectible: Trophy,
      merchandise: ShoppingBag,
      apparel: ShoppingBag,
      clothing: ShoppingBag,
      accessories: ShoppingBag,
      giftmerchandise: Gift,
      giftitem: Gift,
      souvenir: Gift,
      memorabilia: Trophy,
      autograph: FileText,
      signed: CheckCircle,
      certified: CheckCircle,
      authentic: CheckCircle,
      verified: CheckCircle,
      guarantee: Shield,
      warranty: Shield,
      insurance: Shield,
      protection: Shield,
      coverage: Shield,
      claim: FileText,
      dispute: AlertCircle,
      resolution: CheckCircle,
      refundprocess: RefreshCw,
      returnprocess: RefreshCw,
      exchangeprocess: RefreshCw,
      replacement: Package,
      repair: Settings,
      maintenance: Settings,
      servicecenter: Building2,
      supportcenter: HelpCircle,
      helpdesk: HelpCircle,
      technicalsupport: Settings,
      troubleshooting: Settings,
      faqsection: HelpCircle,
      knowledgebase: BookOpen,
      documentation: FileText,
      guides: BookOpen,
      tutorials: BookOpen,
      howto: HelpCircle,
      instructions: FileText,
      stepbystep: FileText,
      tips: Lightbulb,
      tricks: Sparkles,
      hacks: Sparkles,
      shortcuts: Sparkles,
      secrets: Shield,
      insider: Users,
      vip: Star,
      premium: Trophy,
      elite: Trophy,
      platinum: Trophy,
      gold: Trophy,
      silver: Coins,
      bronze: Coins,
      tier: BarChart3,
      level: Target,
      rank: Trophy,
      badge: Award,
      achievement: Trophy,
      milestone: Target,
      progress: BarChart3,
      advancement: Target,
      upgrade: Target,
      unlock: Unlock,
      reward: Gift,
      redeem: Gift,
      claimreward: Gift,
      pointsbalance: Coins,
      pointsexpiry: Clock,
      pointsexpiration: Clock,
      pointsvalidity: Clock,
      validityperiod: Clock,
      expiration: Clock,
      expiry: Clock,
      expired: XCircle,
      active: CheckCircle,
      inactive: XCircle,
      suspended: AlertCircle,
      banned: XCircle,
      restricted: Shield,
      blocked: Shield,
      locked: Lock,
      unlockaccount: Unlock,
      resetpassword: RefreshCw,
      changepassword: Lock,
      updatepassword: Lock,
      passwordreset: RefreshCw,
      forgotpassword: HelpCircle,
      recoveraccount: RefreshCw,
      accountrecovery: RefreshCw,
      securityquestion: HelpCircle,
      twofactor: Shield,
      twofactorauthentication: Shield,
      multifactor: Shield,
      mfa: Shield,
      verification: CheckCircle,
      verify: CheckCircle,
      confirm: CheckCircle,
      confirmationcode: QrCode,
      verificationcode: QrCode,
      otp: QrCode,
      pin: Lock,
      passcode: Lock,
      biometric: Shield,
      faceid: User,
      touchid: Fingerprint,
      fingerprint: Fingerprint,
      pattern: Target,
      gesture: Handshake,
      authentication: Shield,
      authorization: Shield,
      login: User,
      logout: User,
      signin: User,
      signout: User,
      session: Clock,
      timeout: Clock,
      autologout: Clock,
      rememberme: CheckCircle,
      stayloggedin: CheckCircle,
      persistentlogin: CheckCircle,
      guest: User,
      visitor: User,
      member: Award,
      nonmember: User,
      registered: CheckCircle,
      unregistered: User,
      anonymous: User,
      public: Users,
      privateaccount: Shield,
      publicprofile: Users,
      visibility: Eye,
      privacysettings: Shield,
      accountsettings: Settings,
      accountsetup: Settings,
      profileedit: Edit,
      editprofile: Edit,
      updateprofile: Edit,
      changeprofile: Edit,
      modifyprofile: Edit,
      personalinformation: User,
      personalinfo: User,
      personaldata: User,
      contactinformation: Phone,
      contactinfo: Phone,
      contactdetails: Phone,
      email: Mail,
      emailaddress: Mail,
      phone: Phone,
      phonenumber: Phone,
      mobilenumber: Phone,
      cellphone: Phone,
      landline: Phone,
      address: MapPin,
      mailingaddress: Mail,
      billingaddress: CreditCard,
      shippingaddress: Truck,
      deliveryaddress: Truck,
      pickupaddress: Store,
      location: MapPin,
      coordinates: MapPin,
      gps: MapPin,
      map: MapPin,
      navigation: MapPin,
      directions: MapPin,
      route: MapPin,
      distance: MapPin,
      traveltime: Clock,
      duration: Clock,
      eta: Clock,
      estimatedarrival: Clock,
      realtime: Clock,
      live: Clock,
      current: Clock,
      now: Clock,
      instant: Clock,
      immediate: Clock,
      express: Truck,
      priority: Star,
      urgent: AlertCircle,
      emergency: AlertCircle,
      critical: AlertCircle,
      important: AlertCircle,
      normal: CheckCircle,
      standard: CheckCircle,
      regular: CheckCircle,
      routine: CheckCircle,
      scheduled: Calendar,
      appointment: Calendar,
      reservation: Calendar,
      booking: Calendar,
      slot: Calendar,
      timeslot: Clock,
      availability: CheckCircle,
      available: CheckCircle,
      unavailable: XCircle,
      booked: XCircle,
      reserved: Shield,
      occupied: Users,
      vacant: CheckCircle,
      open: CheckCircle,
      closed: XCircle,
      full: XCircle,
      capacity: Users,
      limit: Target,
      maximum: Target,
      minimum: Target,
      quota: Target,
      allowance: Gift,
      allocation: Package,
      limitreached: XCircle,
      exceeded: XCircle,
      violation: AlertCircle,
      breach: AlertCircle,
      unauthorized: XCircle,
      forbidden: XCircle,
      restricted: Shield,
      blocked: Shield,
      banned: XCircle,
      suspended: AlertCircle,
      terminated: XCircle,
      cancelled: XCircle,
      void: XCircle,
      invalid: XCircle,
      expired: XCircle,
      outdated: Clock,
      obsolete: XCircle,
      deprecated: XCircle,
      discontinued: XCircle,
      unavailable: XCircle,
      notavailable: XCircle,
      outofstock: XCircle,
      soldout: XCircle,
      outofprint: XCircle,
      removed: XCircle,
      deleted: Trash2,
      archived: Archive,
      hidden: EyeOff,
      visible: Eye,
      show: Eye,
      hide: EyeOff,
      display: Eye,
      view: Eye,
      preview: Eye,
      review: Eye,
      inspect: Eye,
      examine: Eye,
      check: CheckCircle,
      verify: CheckCircle,
      validate: CheckCircle,
      confirm: CheckCircle,
      approve: CheckCircle,
      authorize: Shield,
      grant: Gift,
      allow: CheckCircle,
      permit: CheckCircle,
      enable: CheckCircle,
      activate: CheckCircle,
      turnon: CheckCircle,
      switchon: CheckCircle,
      on: CheckCircle,
      off: XCircle,
      disable: XCircle,
      deactivate: XCircle,
      turnoff: XCircle,
      switchoff: XCircle,
      pause: Pause,
      resume: Play,
      stop: XCircle,
      cancel: XCircle,
      abort: XCircle,
      terminate: XCircle,
      end: XCircle,
      finish: CheckCircle,
      complete: CheckCircle,
      done: CheckCircle,
      accomplished: Trophy,
      achieved: Trophy,
      succeeded: CheckCircle,
      success: CheckCircle,
      completed: CheckCircle,
      finished: CheckCircle,
      finalized: CheckCircle,
      submitted: CheckCircle,
      sent: CheckCircle,
      delivered: CheckCircle,
      received: CheckCircle,
      acknowledged: CheckCircle,
      confirmed: CheckCircle,
      verified: CheckCircle,
      validated: CheckCircle,
      approved: CheckCircle,
      authorized: Shield,
      granted: Gift,
      issued: FileText,
      generated: Sparkles,
      created: Plus,
      added: Plus,
      new: Sparkles,
      fresh: Sparkles,
      latest: Clock,
      recent: Clock,
      updated: RefreshCw,
      modified: Edit,
      changed: Edit,
      edited: Edit,
      revised: Edit,
      corrected: CheckCircle,
      fixed: CheckCircle,
      repaired: CheckCircle,
      resolved: CheckCircle,
      addressed: CheckCircle,
      handled: CheckCircle,
      processed: Settings,
      inprogress: RefreshCw,
      processing: RefreshCw,
      pending: Clock,
      waiting: Clock,
      queued: Clock,
      scheduled: Calendar,
      delayed: Clock,
      overdue: Clock,
      late: Clock,
      missed: XCircle,
      skipped: XCircle,
      ignored: XCircle,
      dismissed: XCircle,
      rejected: XCircle,
      declined: XCircle,
      refused: XCircle,
      denied: XCircle,
      notaccepted: XCircle,
      invalid: XCircle,
      unacceptable: XCircle,
      unsatisfactory: XCircle,
      poor: XCircle,
      bad: XCircle,
      terrible: XCircle,
      awful: XCircle,
      horrible: XCircle,
      worst: XCircle,
      unacceptable: XCircle,
      failed: XCircle,
      error: XCircle,
      bug: XCircle,
      issue: AlertCircle,
      problem: AlertCircle,
      glitch: AlertCircle,
      malfunction: AlertCircle,
      breakdown: AlertCircle,
      crash: AlertCircle,
      freeze: AlertCircle,
      hang: AlertCircle,
      stuck: AlertCircle,
      unresponsive: AlertCircle,
      timeout: Clock,
      connectionlost: AlertCircle,
      disconnected: AlertCircle,
      offline: XCircle,
      online: CheckCircle,
      connected: CheckCircle,
      linked: CheckCircle,
      synced: RefreshCw,
      synchronized: RefreshCw,
      updated: RefreshCw,
      refreshed: RefreshCw,
      reloaded: RefreshCw,
      restarted: RefreshCw,
      reset: RefreshCw,
      restored: RefreshCw,
      recovered: RefreshCw,
      revived: RefreshCw,
      renewed: RefreshCw,
      regenerated: Sparkles,
      recreated: Plus,
      rebuilt: Settings,
      reconstructed: Settings,
      reestablished: CheckCircle,
      reconnected: CheckCircle,
      reenabled: CheckCircle,
      reactivated: CheckCircle,
      resumed: Play,
      continued: Play,
      proceed: ArrowRight,
      advance: ArrowRight,
      progress: BarChart3,
      moveforward: ArrowRight,
      next: ArrowRight,
      skip: SkipForward,
      previous: ArrowLeft,
      back: ArrowLeft,
      return: ArrowLeft,
      goback: ArrowLeft,
      retreat: ArrowLeft,
      undo: ArrowLeft,
      redo: ArrowRight,
      repeat: RefreshCw,
      again: RefreshCw,
      retry: RefreshCw,
      attempt: Target,
      try: Target,
      effort: Target,
      action: Zap,
      execute: Zap,
      perform: Zap,
      carryout: Truck,
      implement: Settings,
      apply: CheckCircle,
      use: CheckCircle,
      utilize: CheckCircle,
      employ: CheckCircle,
      deploy: Rocket,
      launch: Rocket,
      initiate: Zap,
      start: Play,
      begin: Play,
      commence: Play,
      open: CheckCircle,
      activate: CheckCircle,
      enable: CheckCircle,
      turnon: CheckCircle,
      switchon: CheckCircle,
      poweron: CheckCircle,
      boot: Settings,
      startup: Settings,
      initialize: Settings,
      setup: Settings,
      configure: Settings,
      install: Settings,
      setup: Settings,
      installation: Settings,
      setupwizard: Settings,
      configuration: Settings,
      settings: Settings,
      preferences: Settings,
      options: Settings,
      customization: Sparkles,
      personalization: User,
      tailoring: Edit,
      adaptation: Edit,
      modification: Edit,
      adjustment: Settings,
      finetuning: Settings,
      optimization: Target,
      improvement: Target,
      enhancement: Sparkles,
      upgrade: Target,
      update: RefreshCw,
      refresh: RefreshCw,
      renew: RefreshCw,
      revive: RefreshCw,
      restore: RefreshCw,
      recover: RefreshCw,
      repair: CheckCircle,
      fix: CheckCircle,
      mend: CheckCircle,
      patch: CheckCircle,
      correct: CheckCircle,
      rectify: CheckCircle,
      resolve: CheckCircle,
      solve: CheckCircle,
      troubleshoot: Settings,
      debug: Settings,
      diagnose: Settings,
      analyze: BarChart3,
      examine: Eye,
      inspect: Eye,
      review: Eye,
      audit: FileText,
      verify: CheckCircle,
      validate: CheckCircle,
      confirm: CheckCircle,
      check: CheckCircle,
      test: Target,
      trial: Gift,
      demo: Eye,
      sample: Gift,
      preview: Eye,
      glimpse: Eye,
      peek: Eye,
      look: Eye,
      see: Eye,
      view: Eye,
      watch: Eye,
      observe: Eye,
      monitor: Eye,
      track: Target,
      trace: Target,
      follow: Target,
      locate: MapPin,
      find: Search,
      search: Search,
      seek: Search,
      lookfor: Search,
      hunt: Search,
      discover: Search,
      explore: Search,
      investigate: Search,
      research: Search,
      study: BookOpen,
      learn: BookOpen,
      educate: BookOpen,
      train: BookOpen,
      teach: BookOpen,
      instruct: FileText,
      guide: FileText,
      mentor: User,
      coach: User,
      tutor: User,
      support: HelpCircle,
      help: HelpCircle,
      assist: HelpCircle,
      aid: HelpCircle,
      support: HelpCircle,
      backup: RefreshCw,
      rescue: RefreshCw,
      save: CheckCircle,
      protect: Shield,
      guard: Shield,
      defend: Shield,
      secure: Shield,
      safeguard: Shield,
      shield: Shield,
      cover: Shield,
      shelter: Shield,
      hide: EyeOff,
      conceal: EyeOff,
      mask: EyeOff,
      obscure: EyeOff,
      encrypt: Lock,
      encode: Lock,
      decode: Unlock,
      decrypt: Unlock,
      lock: Lock,
      unlock: Unlock,
      open: CheckCircle,
      close: XCircle,
      seal: Lock,
      unseal: Unlock,
      fasten: Lock,
      unfasten: Unlock,
      attach: Plus,
      detach: X,
      connect: Link,
      disconnect: X,
      link: Link,
      unlink: X,
      join: Users,
      separate: X,
      merge: Link,
      split: X,
      combine: Link,
      divide: X,
      unite: Users,
      group: Users,
      ungroup: User,
      collect: Package,
      gather: Package,
      assemble: Package,
      compile: FileText,
      consolidate: Package,
      accumulate: Package,
      aggregate: Package,
      amass: Package,
    };

    // Check for exact matches first
    if (iconMap[categoryLower]) {
      return iconMap[categoryLower];
    }

    // Check for partial matches
    for (const [keyword, icon] of Object.entries(iconMap)) {
      if (categoryLower.includes(keyword) || keyword.includes(categoryLower)) {
        return icon;
      }
    }

    // Default icon for general categories
    return Tag;
  };

  const handleCategoryInput = (event) => {
    const value = event.target.value;
    // Extract category text (remove any existing icon prefixes or special characters)
    const categoryText = value.replace(/^[^\w\s]+/, '').trim();
    
    if (categoryText) {
      categoryIconSuggestion.value = getCategoryIcon(categoryText);
    } else {
      categoryIconSuggestion.value = null;
    }
  };

  const applyIconToCategory = () => {
    // Icons are visual only - category field stores text only
    // This function is kept for UI consistency but icons aren't saved with the category
    // The icon will be recalculated when the category is loaded based on its text
  };

  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => (toast.value.show = false), 3000);
  };

  const activeSortableInstance = ref(null);
  const inactiveSortableInstance = ref(null);
  const isDragging = ref(false);
  const activeTbody = ref(null);
  const inactiveTbody = ref(null);

  // Pagination state
  const itemsPerPage = ref(5);
  const activePage = ref(1);
  const inactivePage = ref(1);

  // Computed properties for separated FAQs
  const activeFAQs = computed(() => {
    return faqs.value.filter(faq => faq.is_active).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  });

  const inactiveFAQs = computed(() => {
    return faqs.value.filter(faq => !faq.is_active).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  });

  // Paginated FAQs
  const paginatedActiveFAQs = computed(() => {
    const start = (activePage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return activeFAQs.value.slice(start, end);
  });

  const paginatedInactiveFAQs = computed(() => {
    const start = (inactivePage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return inactiveFAQs.value.slice(start, end);
  });

  // Pagination info
  const activeTotalPages = computed(() => Math.ceil(activeFAQs.value.length / itemsPerPage.value));
  const inactiveTotalPages = computed(() => Math.ceil(inactiveFAQs.value.length / itemsPerPage.value));

  // Pagination methods
  const setActivePage = (page) => {
    activePage.value = Math.max(1, Math.min(page, activeTotalPages.value));
  };

  const setInactivePage = (page) => {
    inactivePage.value = Math.max(1, Math.min(page, inactiveTotalPages.value));
  };

  const loadFAQs = async () => {
    loading.value = true;
    try {
      const params = {};
      if (searchQuery.value) {
        params.search = searchQuery.value;
      }
      
      // Reset pagination when loading new data
      activePage.value = 1;
      inactivePage.value = 1;

      const response = await axios.get(`${apiConfig.baseURL}/faqs`, { params });
      const loadedFAQs = response.data.data || [];
      
      // Normalize display_order to be sequential (1, 2, 3, 4, 5, 6...)
      // Separate active and inactive
      const active = loadedFAQs.filter(f => f.is_active).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      const inactive = loadedFAQs.filter(f => !f.is_active).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      // Check if orders need updating and update backend
      const orderUpdates = [];
      active.forEach((faq, index) => {
        const correctOrder = index + 1;
        const oldOrder = faq.display_order;
        if (oldOrder !== correctOrder) {
          faq.display_order = correctOrder;
          orderUpdates.push(
            axios.put(`${apiConfig.baseURL}/faqs/${faq.id}`, { display_order: correctOrder })
          );
        }
      });
      inactive.forEach((faq, index) => {
        const correctOrder = index + 1;
        const oldOrder = faq.display_order;
        if (oldOrder !== correctOrder) {
          faq.display_order = correctOrder;
          orderUpdates.push(
            axios.put(`${apiConfig.baseURL}/faqs/${faq.id}`, { display_order: correctOrder })
          );
        }
      });
      
      // Update backend silently if order was wrong (don't show error if it fails)
      if (orderUpdates.length > 0) {
        Promise.all(orderUpdates).catch(err => console.warn('Warning: Some order updates failed:', err));
      }
      
      faqs.value = [...active, ...inactive];
      
      // Initialize sortable after FAQs are loaded
      await nextTick();
      setTimeout(() => initSortable(), 300);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      showToast('error', error.response?.data?.message || 'Failed to load FAQs');
    } finally {
      loading.value = false;
    }
  };

  const initSortable = () => {
    try {
      // Don't reinitialize while dragging is in progress
      if (isDragging.value) {
        console.log('⏸️ Skipping sortable initialization - drag in progress');
        return;
      }

      // Destroy existing instances
      if (activeSortableInstance?.value) {
        try {
          activeSortableInstance.value.destroy();
        } catch (err) {
          console.warn('Error destroying active sortable:', err);
        }
        activeSortableInstance.value = null;
      }
      if (inactiveSortableInstance?.value) {
        try {
          inactiveSortableInstance.value.destroy();
        } catch (err) {
          console.warn('Error destroying inactive sortable:', err);
        }
        inactiveSortableInstance.value = null;
      }

      if (loading.value) return;

    // Wait for DOM to be ready
    nextTick(() => {
      // Ensure placeholders exist before initializing SortableJS
      const ensurePlaceholder = (tbody, placeholderId) => {
        if (!tbody) return false;
        
        // Always ensure tbody has at least one child for SortableJS
        const hasItems = Array.from(tbody.children || []).some(n => {
          const id = n.dataset?.id;
          return id && !id.includes('placeholder') && !n.classList.contains('no-drag');
        });
        
        const hasPlaceholder = tbody.querySelector(`[data-id="${placeholderId}"]`);
        
        // If empty or only has empty message row, ensure placeholder exists
        if (!hasItems) {
          if (!hasPlaceholder) {
            // Create a minimal placeholder to prevent null errors
            const placeholder = document.createElement('tr');
            placeholder.setAttribute('data-id', placeholderId);
            placeholder.className = 'sortable-placeholder';
            placeholder.style.cssText = 'height: 1px; line-height: 0; font-size: 0; visibility: hidden; overflow: hidden; position: absolute; width: 100%; pointer-events: none;';
            const td = document.createElement('td');
            td.colSpan = 6;
            td.style.cssText = 'padding: 0; height: 1px; border: none;';
            placeholder.appendChild(td);
            // Insert before empty message row if it exists, otherwise append
            const emptyMessageRow = tbody.querySelector('.no-drag');
            if (emptyMessageRow) {
              tbody.insertBefore(placeholder, emptyMessageRow);
            } else {
              tbody.appendChild(placeholder);
            }
            return true;
          }
          // If placeholder exists, ensure it's not the only child (add empty message check)
          const validChildren = Array.from(tbody.children).filter(child => 
            child.dataset?.id || child.classList.contains('no-drag') || child.classList.contains('sortable-placeholder')
          );
          if (validChildren.length === 0) {
            // No valid children at all - create placeholder
            const placeholder = document.createElement('tr');
            placeholder.setAttribute('data-id', placeholderId);
            placeholder.className = 'sortable-placeholder';
            placeholder.style.cssText = 'height: 1px; line-height: 0; font-size: 0; visibility: hidden; overflow: hidden; position: absolute; width: 100%; pointer-events: none;';
            const td = document.createElement('td');
            td.colSpan = 6;
            td.style.cssText = 'padding: 0; height: 1px; border: none;';
            placeholder.appendChild(td);
            tbody.appendChild(placeholder);
            return true;
          }
        }
        return false;
      };

      // Initialize Active FAQs sortable (always initialize so it can accept drops)
      const activeBodyEl = activeTbody.value;
      if (activeBodyEl) {
        try {
          // Ensure placeholder exists (only if current page is empty)
          if (paginatedActiveFAQs.value.length === 0) {
            ensurePlaceholder(activeBodyEl, 'placeholder-active');
          }
          
          // Destroy existing instance first
          if (activeSortableInstance.value) {
            activeSortableInstance.value.destroy();
          }
          
          activeSortableInstance.value = Sortable.create(activeBodyEl, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            group: { 
              name: 'faqs', 
              pull: true, 
              put: true 
            },
            draggable: 'tr[data-id]:not(.sortable-placeholder)',
            filter: '.no-drag, .sortable-placeholder',
            preventOnFilter: false,
            fallbackOnBody: true,
            fallbackTolerance: 0,
            invalid: (el, handle) => {
              // Prevent dragging placeholder or empty message rows
              return !el || !el.dataset?.id || el.dataset.id.includes('placeholder') || el.classList.contains('no-drag');
            },
            dragClass: 'sortable-drag',
            forceFallback: false,
            swapThreshold: 0.65,
            emptyInsertThreshold: 50,
            onMove: (evt) => {
              try {
                // Always allow moves - handle null cases gracefully
                if (!evt.related || !evt.related.parentElement || !evt.dragged) {
                  return true; // Allow drop into empty table
                }
                // Ensure target container exists and has structure
                const targetContainer = evt.to;
                if (!targetContainer) {
                  return true; // No target, allow (will be handled by SortableJS)
                }
                if (targetContainer.children.length === 0) {
                  // Ensure placeholder exists for empty container
                  ensurePlaceholder(targetContainer, 'placeholder-active');
                  return true; // Empty container, allow drop
                }
                // Ensure target container's lastElementChild is valid
                try {
                  const lastChild = targetContainer.lastElementChild;
                  if (!lastChild) {
                    ensurePlaceholder(targetContainer, 'placeholder-active');
                  }
                } catch (err) {
                  // If lastElementChild access fails, ensure placeholder exists
                  ensurePlaceholder(targetContainer, 'placeholder-active');
                }
                console.log('🔄 Move event:', { 
                  related: evt.related?.dataset?.id, 
                  dragged: evt.dragged?.dataset?.id 
                });
                return true;
              } catch (err) {
                console.error('Error in onMove:', err);
                return true; // Always allow move on error
              }
            },
            onStart: (evt) => {
              isDragging.value = true;
              console.log('✅✅✅ Drag STARTED - Active Table:', {
                item: evt.item?.dataset?.id,
                index: evt.oldIndex
              });
              document.body.style.cursor = 'grabbing';
            },
            onAdd: (evt) => {
              try {
                console.log('➕ Item added to Active table:', evt.item?.dataset?.id);
                // Ensure target has valid children after add
                if (evt.to && evt.to.children.length === 0) {
                  console.warn('Target container empty after add, ensuring placeholder');
                  ensurePlaceholder(evt.to, 'placeholder-active');
                }
                // Schedule the update after SortableJS is done
                setTimeout(() => {
                  handleSortChange(evt).catch(err => {
                    console.error('Error handling sort change:', err);
                  });
                }, 100);
              } catch (err) {
                console.error('Error in onAdd:', err);
              }
            },
            onUpdate: (evt) => {
              try {
                console.log('🔄 Item updated within Active table:', evt.item?.dataset?.id);
                // Schedule the update after SortableJS is done
                setTimeout(() => {
                  handleSortChange(evt).catch(err => {
                    console.error('Error handling sort change:', err);
                  });
                }, 100);
              } catch (err) {
                console.error('Error in onUpdate:', err);
              }
            },
            onEnd: (evt) => {
              try {
                console.log('✅✅✅ Drag ENDED - Active Table:', {
                  item: evt.item?.dataset?.id,
                  oldIndex: evt.oldIndex,
                  newIndex: evt.newIndex,
                  from: evt.from === activeBodyEl ? 'Active' : 'Other',
                  to: evt.to === activeBodyEl ? 'Active' : (evt.to === inactiveTbody.value ? 'Inactive' : 'Other')
                });
                document.body.style.cursor = '';
                // Reset dragging flag after a delay to allow cleanup
                setTimeout(() => {
                  isDragging.value = false;
                }, 200);
              } catch (err) {
                console.error('Error in onEnd:', err);
                document.body.style.cursor = '';
                isDragging.value = false;
              }
            },
          });
          console.log('✅ Active sortable initialized successfully!', {
            element: activeBodyEl,
            rows: activeBodyEl.querySelectorAll('tr[data-id]').length,
            instance: activeSortableInstance.value
          });
        } catch (err) {
          console.error('❌ Error creating active sortable:', err);
        }
      }

      // Initialize Inactive FAQs sortable (always initialize so it can accept drops)
      const inactiveBodyEl = inactiveTbody.value;
      if (inactiveBodyEl) {
        try {
          // Ensure placeholder exists (only if current page is empty)
          if (paginatedInactiveFAQs.value.length === 0) {
            ensurePlaceholder(inactiveBodyEl, 'placeholder-inactive');
          }
          
          // Destroy existing instance first
          if (inactiveSortableInstance.value) {
            inactiveSortableInstance.value.destroy();
          }
          
          inactiveSortableInstance.value = Sortable.create(inactiveBodyEl, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            group: { 
              name: 'faqs', 
              pull: true, 
              put: true 
            },
            draggable: 'tr[data-id]:not(.sortable-placeholder)',
            filter: '.no-drag, .sortable-placeholder',
            preventOnFilter: false,
            fallbackOnBody: true,
            fallbackTolerance: 0,
            invalid: (el, handle) => {
              // Prevent dragging placeholder or empty message rows
              return !el || !el.dataset?.id || el.dataset.id.includes('placeholder') || el.classList.contains('no-drag');
            },
            dragClass: 'sortable-drag',
            forceFallback: false,
            swapThreshold: 0.65,
            emptyInsertThreshold: 50,
            onMove: (evt) => {
              try {
                // Always allow moves - handle null cases gracefully
                if (!evt.related || !evt.related.parentElement || !evt.dragged) {
                  return true; // Allow drop into empty table
                }
                // Ensure target container exists and has structure
                const targetContainer = evt.to;
                if (!targetContainer) {
                  return true; // No target, allow (will be handled by SortableJS)
                }
                if (targetContainer.children.length === 0) {
                  // Ensure placeholder exists for empty container
                  ensurePlaceholder(targetContainer, 'placeholder-inactive');
                  return true; // Empty container, allow drop
                }
                // Ensure target container's lastElementChild is valid
                try {
                  const lastChild = targetContainer.lastElementChild;
                  if (!lastChild) {
                    ensurePlaceholder(targetContainer, 'placeholder-inactive');
                  }
                } catch (err) {
                  // If lastElementChild access fails, ensure placeholder exists
                  ensurePlaceholder(targetContainer, 'placeholder-inactive');
                }
                console.log('🔄 Move event - Inactive:', { 
                  related: evt.related?.dataset?.id, 
                  dragged: evt.dragged?.dataset?.id 
                });
                return true;
              } catch (err) {
                console.error('Error in onMove:', err);
                return true; // Always allow move on error
              }
            },
            onAdd: (evt) => {
              try {
                console.log('➕ Item added to Inactive table:', evt.item?.dataset?.id);
                // Ensure target has valid children after add
                if (evt.to && evt.to.children.length === 0) {
                  console.warn('Target container empty after add, ensuring placeholder');
                  ensurePlaceholder(evt.to, 'placeholder-inactive');
                }
                // Schedule the update after SortableJS is done
                setTimeout(() => {
                  handleSortChange(evt).catch(err => {
                    console.error('Error handling sort change:', err);
                  });
                }, 100);
              } catch (err) {
                console.error('Error in onAdd:', err);
              }
            },
            onUpdate: (evt) => {
              try {
                console.log('🔄 Item updated within Inactive table:', evt.item?.dataset?.id);
                // Schedule the update after SortableJS is done
                setTimeout(() => {
                  handleSortChange(evt).catch(err => {
                    console.error('Error handling sort change:', err);
                  });
                }, 100);
              } catch (err) {
                console.error('Error in onUpdate:', err);
              }
            },
            onStart: (evt) => {
              try {
                isDragging.value = true;
                console.log('✅✅✅ Drag STARTED - Inactive Table:', {
                  item: evt.item?.dataset?.id,
                  index: evt.oldIndex
                });
                document.body.style.cursor = 'grabbing';
              } catch (err) {
                console.error('Error in onStart:', err);
              }
            },
            onEnd: (evt) => {
              try {
                console.log('✅✅✅ Drag ENDED - Inactive Table:', {
                  item: evt.item?.dataset?.id,
                  oldIndex: evt.oldIndex,
                  newIndex: evt.newIndex,
                  from: evt.from === inactiveBodyEl ? 'Inactive' : 'Other',
                  to: evt.to === inactiveBodyEl ? 'Inactive' : (evt.to === activeTbody.value ? 'Active' : 'Other')
                });
                document.body.style.cursor = '';
                // Reset dragging flag after a delay to allow cleanup
                setTimeout(() => {
                  isDragging.value = false;
                }, 200);
              } catch (err) {
                console.error('Error in onEnd:', err);
                document.body.style.cursor = '';
                isDragging.value = false;
              }
            },
          });
          console.log('✅ Inactive sortable initialized successfully!', {
            element: inactiveBodyEl,
            rows: inactiveBodyEl.querySelectorAll('tr[data-id]').length,
            instance: inactiveSortableInstance.value
          });
        } catch (err) {
          console.error('❌ Error creating inactive sortable:', err);
        }
      }
    });
    } catch (error) {
      console.error('Error initializing sortable:', error);
    }
  };

  const handleSortChange = async (evt) => {
    const { oldIndex, newIndex, item, from, to } = evt;
    
    // Validate inputs
    if (!item || !from || !to) {
      console.warn('Invalid sort event:', { item, from, to });
      return;
    }
    
    const movedFAQId = parseInt(item?.dataset?.id);
    if (!movedFAQId || oldIndex === null) {
      console.warn('Invalid sort - missing FAQ ID or oldIndex:', { movedFAQId, oldIndex, newIndex });
      return;
    }
    
    // If newIndex is null, it means we're dropping into an empty table - set to 0
    if (newIndex === null || newIndex === undefined) {
      // Check if target table is empty
      const targetHasItems = Array.from(to.children || []).some(n => {
        const id = n.dataset?.id;
        return id && !id.includes('placeholder') && !n.classList.contains('no-drag');
      });
      if (!targetHasItems) {
        // Dropping into empty table - set newIndex to 0
        evt.newIndex = 0;
        console.log('📦 Empty table drop detected, setting newIndex to 0');
      } else {
        console.warn('Invalid sort - newIndex is null but table has items:', { movedFAQId, oldIndex, newIndex });
        return;
      }
    }

    // Determine source/target lists
    const movedToActive = to === activeTbody.value;
    const movedFromActive = from === activeTbody.value;
    
    console.log('📦 Handling sort change:', {
      movedFAQId,
      from: movedFromActive ? 'Active' : 'Inactive',
      to: movedToActive ? 'Active' : 'Inactive',
      oldIndex,
      newIndex
    });

    // Prepare lists sorted by order
    const activeList = [...faqs.value.filter(f => f.is_active)].sort((a,b)=> (a.display_order||0)-(b.display_order||0));
    const inactiveList = [...faqs.value.filter(f => !f.is_active)].sort((a,b)=> (a.display_order||0)-(b.display_order||0));

    // Helper to get adjusted index inside a container (skip non data rows)
    const getAdjustedIndex = (container, rawIndex) => {
      if (!container || !container.children) return 0;
      const nodes = Array.from(container.children);
      let idx = -1, seen = 0;
      
      // Filter out placeholder, loading, and empty message rows
      const dataRows = nodes.filter(n => {
        const id = n.dataset?.id;
        return id && !id.includes('placeholder') && !n.classList.contains('no-drag');
      });
      
      // If container is empty, return 0
      if (dataRows.length === 0) return 0;
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeId = node.dataset?.id;
        // Skip placeholder, loading, and empty message rows
        if (nodeId && !nodeId.includes('placeholder') && !node.classList.contains('no-drag')) {
          if (i === rawIndex) idx = seen;
          seen++;
        }
      }
      // If dropping after last row, place at end
      if (idx === -1) idx = seen; 
      return Math.max(0, idx);
    };

    const sourceIndex = getAdjustedIndex(from, oldIndex);
    let targetIndex = getAdjustedIndex(to, newIndex);
    
    // If target is empty, set index to 0
    const targetHasRows = Array.from(to.children || []).some(n => n.dataset?.id);
    if (!targetHasRows) targetIndex = 0;

    // Remove from source
    let movedItem;
    if (movedFromActive) {
      const realIndex = activeList.findIndex(f => f.id === movedFAQId);
      if (realIndex === -1) return;
      movedItem = activeList.splice(realIndex, 1)[0];
    } else {
      const realIndex = inactiveList.findIndex(f => f.id === movedFAQId);
      if (realIndex === -1) return;
      movedItem = inactiveList.splice(realIndex, 1)[0];
    }

    // Insert into target
    if (movedToActive) {
      movedItem.is_active = true;
      activeList.splice(Math.min(targetIndex, activeList.length), 0, movedItem);
    } else {
      movedItem.is_active = false;
      inactiveList.splice(Math.min(targetIndex, inactiveList.length), 0, movedItem);
    }

    // Recompute sequential orders
    const updates = [];
    activeList.forEach((f, i) => {
      const newOrder = i + 1;
      if (f.display_order !== newOrder || f.is_active !== true) {
        f.display_order = newOrder;
        f.is_active = true;
        updates.push(axios.put(`${apiConfig.baseURL}/faqs/${f.id}`, { display_order: newOrder, is_active: true }));
      }
    });
    inactiveList.forEach((f, i) => {
      const newOrder = i + 1;
      if (f.display_order !== newOrder || f.is_active !== false) {
        f.display_order = newOrder;
        f.is_active = false;
        updates.push(axios.put(`${apiConfig.baseURL}/faqs/${f.id}`, { display_order: newOrder, is_active: false }));
      }
    });

    try {
      if (updates.length) {
        await Promise.all(updates);
        // Reload stats after status change
        await loadStats();
      }
      faqs.value = [...activeList, ...inactiveList];
      
      // Show appropriate message based on what happened
      if (movedFromActive !== movedToActive) {
        showToast('success', `FAQ moved to ${movedToActive ? 'Active' : 'Inactive'} and order updated`);
      } else {
        showToast('success', 'FAQ order updated');
      }
      
      // Reinitialize sortable to update both tables (after DOM updates)
      await nextTick();
      // Wait longer to ensure SortableJS has fully cleaned up and dragging is complete
      setTimeout(() => {
        if (!isDragging.value) {
          try {
            initSortable();
          } catch (err) {
            console.error('Error reinitializing sortable:', err);
          }
        } else {
          // Retry after drag completes
          setTimeout(() => {
            try {
              initSortable();
            } catch (err) {
              console.error('Error reinitializing sortable (retry):', err);
            }
          }, 500);
        }
      }, 400);
    } catch (error) {
      console.error('Error updating FAQ order:', error);
      showToast('error', 'Failed to update FAQ order');
      await loadFAQs();
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${apiConfig.baseURL}/faqs/stats`);
      stats.value = response.data.data || stats.value;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${apiConfig.baseURL}/faqs/categories`);
      categories.value = response.data.data || [];
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const openCreateModal = () => {
    editingFAQ.value = null;
    faqForm.value = {
      question: '',
      answer: '',
      category: '',
    };
    categoryIconSuggestion.value = null;
    faqModal.value?.showModal();
  };

  const openEditModal = (faq) => {
    editingFAQ.value = faq;
    faqForm.value = {
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
    };
    // Calculate icon suggestion for existing category
    if (faqForm.value.category) {
      const categoryText = faqForm.value.category.replace(/^[^\w\s]+/, '').trim();
      categoryIconSuggestion.value = getCategoryIcon(categoryText);
    } else {
      categoryIconSuggestion.value = null;
    }
    faqModal.value?.showModal();
  };

  const closeModal = () => {
    faqModal.value?.close();
    editingFAQ.value = null;
    categoryIconSuggestion.value = null;
  };

  const saveFAQ = async () => {
    saving.value = true;
    try {
      // Prepare data without display_order and is_active
      // display_order is managed by drag-and-drop position
      // is_active is managed by which table (Active/Inactive) the FAQ is in
      const faqData = {
        question: faqForm.value.question,
        answer: faqForm.value.answer,
        category: faqForm.value.category,
      };

      if (editingFAQ.value) {
        // Editing - preserve existing is_active status and display_order
        await axios.put(`${apiConfig.baseURL}/faqs/${editingFAQ.value.id}`, faqData);
        showToast('success', 'FAQ updated successfully');
      } else {
        // New FAQs default to active and get the highest order + 1 for active FAQs
        const activeFAQsMaxOrder = faqs.value.filter(f => f.is_active).length > 0
          ? Math.max(...faqs.value.filter(f => f.is_active).map(f => f.display_order || 0))
          : 0;
        faqData.display_order = activeFAQsMaxOrder + 1;
        faqData.is_active = true; // New FAQs default to active
        await axios.post(`${apiConfig.baseURL}/faqs`, faqData);
        showToast('success', 'FAQ created successfully');
      }
      await loadFAQs();
      await loadStats();
      await loadCategories();
      closeModal();
      // Reinitialize sortable after changes
      await nextTick();
      setTimeout(() => {
        try {
          initSortable();
        } catch (err) {
          console.error('Error reinitializing sortable:', err);
        }
      }, 300);
    } catch (error) {
      console.error('Error saving FAQ:', error);
      showToast(
        'error',
        error.response?.data?.message || error.message || 'Failed to save FAQ'
      );
    } finally {
      saving.value = false;
    }
  };

  const confirmDelete = (faq) => {
    deletingFAQ.value = faq;
    deleteModal.value?.showModal();
  };

  const closeDeleteModal = () => {
    deleteModal.value?.close();
    deletingFAQ.value = null;
  };

  const deleteFAQ = async () => {
    if (!deletingFAQ.value) return;

    saving.value = true;
    try {
      await axios.delete(`${apiConfig.baseURL}/faqs/${deletingFAQ.value.id}`);
      showToast('success', 'FAQ deleted successfully');
      await loadFAQs();
      await loadStats();
      await loadCategories();
      closeDeleteModal();
      // Reinitialize sortable after deletion
      await nextTick();
      setTimeout(() => {
        try {
          initSortable();
        } catch (err) {
          console.error('Error reinitializing sortable:', err);
        }
      }, 300);
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      showToast(
        'error',
        error.response?.data?.message || error.message || 'Failed to delete FAQ'
      );
    } finally {
      saving.value = false;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncate = (text, length) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  onMounted(() => {
    loadFAQs();
    loadStats();
    loadCategories();
  });
</script>

<style scoped>
  /* Custom scrollbar styling for modal */
  .modal-box::-webkit-scrollbar {
    width: 8px;
  }

  .modal-box::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .modal-box::-webkit-scrollbar-thumb {
    background: var(--color-primaryColor);
    border-radius: 4px;
  }

  .modal-box::-webkit-scrollbar-thumb:hover {
    background: var(--color-primaryColor);
    opacity: 0.8;
  }

  /* Toggle custom color */
  .toggle {
    --tglbg: transparent;
    border-color: var(--color-primaryColor);
  }

  .toggle:checked {
    --tglbg: var(--color-primaryColor);
    border-color: var(--color-primaryColor);
  }

  /* Sortable styles */
  .sortable-ghost {
    opacity: 0.4;
    background: #f3f4f6;
  }

  .sortable-chosen {
    background: #e5e7eb;
  }

  .drag-handle {
    user-select: none;
    cursor: grab;
    touch-action: none;
    pointer-events: auto;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .drag-handle:hover {
    color: var(--color-primaryColor) !important;
  }

  .cursor-move {
    cursor: move;
  }

  .sortable-drag {
    opacity: 0.8;
  }

  /* Ensure buttons are always clickable */
  tr[data-id] button {
    pointer-events: auto !important;
    cursor: pointer;
    z-index: 10;
    position: relative;
  }

  /* Only disable buttons during active drag */
  .sortable-chosen button,
  .sortable-drag button {
    pointer-events: none;
  }

  /* Ensure drag handle is always interactive */
  .drag-handle {
    pointer-events: auto !important;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>