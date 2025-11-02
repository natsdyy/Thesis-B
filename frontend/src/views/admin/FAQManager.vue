<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">FAQ Management</h1>
      <p class="text-gray-600">Manage frequently asked questions</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Total FAQs</div>
        <div class="stat-value text-primary">{{ stats.total_faqs }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Active FAQs</div>
        <div class="stat-value text-success">{{ stats.active_faqs }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Inactive FAQs</div>
        <div class="stat-value text-warning">{{ stats.inactive_faqs }}</div>
      </div>
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Categories</div>
        <div class="stat-value text-info">{{ stats.total_categories }}</div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex-1">
        <div class="form-control">
          <div class="input-group">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search FAQs..."
              class="input input-bordered w-full"
            />
            <button class="btn btn-square" @click="loadFAQs">
              <Search :size="20" />
            </button>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <select
          v-model="statusFilter"
          class="select select-bordered"
          @change="loadFAQs"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          v-model="categoryFilter"
          class="select select-bordered"
          @change="loadFAQs"
        >
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
        <button class="btn text-white hover:opacity-90 active:opacity-80" style="background-color: var(--color-primaryColor); border-color: var(--color-primaryColor);" @click="openCreateModal">
          <Plus :size="20" class="mr-2" />
          Add FAQ
        </button>
        <button class="btn btn-ghost" @click="loadFAQs" :disabled="loading">
          <RefreshCw :size="20" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- FAQ Table -->
    <div class="card bg-base-100 shadow">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Order</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-8">
                  <span class="loading loading-spinner loading-lg"></span>
                </td>
              </tr>
              <tr v-else-if="faqs.length === 0">
                <td colspan="6" class="text-center py-8 text-gray-500">
                  No FAQs found
                </td>
              </tr>
              <tr v-for="faq in faqs" :key="faq.id">
                <td>
                  <div class="font-medium">{{ truncate(faq.question, 60) }}</div>
                </td>
                <td>
                  <span v-if="faq.category" class="badge badge-outline">
                    {{ faq.category }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td>{{ faq.display_order }}</td>
                <td>
                  <span
                    :class="
                      faq.is_active
                        ? 'badge badge-success'
                        : 'badge badge-error'
                    "
                  >
                    {{ faq.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>{{ formatDate(faq.created_at) }}</td>
                <td>
                  <div class="flex gap-2">
                    <button
                      class="btn btn-sm btn-ghost"
                      @click="openEditModal(faq)"
                      title="Edit"
                    >
                      <Edit :size="16" />
                    </button>
                    <button
                      class="btn btn-sm btn-ghost text-error"
                      @click="confirmDelete(faq)"
                      title="Delete"
                    >
                      <Trash2 :size="16" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog ref="faqModal" class="modal">
      <div class="modal-box max-w-3xl w-full max-h-[85vh]">
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
                class="textarea textarea-bordered resize-none min-h-[4rem] h-[4rem]"
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
                class="textarea textarea-bordered resize-none min-h-[4rem] h-[4rem]"
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
                  <span v-else class="label-text-alt text-gray-500"
                    >Optional</span
                  >
                </label>
              </div>

              <div class="form-control flex flex-col h-full">
                <label class="label min-h-[1.75rem] pb-2 pt-0 mb-0 flex items-center">
                  <span class="label-text font-semibold text-gray-700"
                    >Display Order</span
                  >
                </label>
                <input
                  v-model.number="faqForm.display_order"
                  type="number"
                  class="input input-bordered w-full h-[2.75rem] min-h-[2.75rem]"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="faqForm.is_active"
                  type="checkbox"
                  class="toggle"
                />
                <span class="label-text font-semibold text-gray-700"
                  >Active Status</span
                >
              </label>
            </div>
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              @click="closeModal"
              :disabled="saving"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn text-white hover:opacity-90 active:opacity-80"
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
  import { ref, onMounted, computed } from 'vue';
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
  const statusFilter = ref('all');
  const categoryFilter = ref('');
  const faqModal = ref(null);
  const deleteModal = ref(null);
  const editingFAQ = ref(null);
  const deletingFAQ = ref(null);

  const faqForm = ref({
    question: '',
    answer: '',
    category: '',
    display_order: 0,
    is_active: true,
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

  const loadFAQs = async () => {
    loading.value = true;
    try {
      const params = {};
      if (searchQuery.value) {
        params.search = searchQuery.value;
      }
      if (statusFilter.value === 'active') {
        params.is_active = 'true';
      } else if (statusFilter.value === 'inactive') {
        params.is_active = 'false';
      }
      if (categoryFilter.value) {
        params.category = categoryFilter.value;
      }

      const response = await axios.get(`${apiConfig.baseURL}/faqs`, { params });
      faqs.value = response.data.data || [];
    } catch (error) {
      console.error('Error loading FAQs:', error);
      showToast('error', error.response?.data?.message || 'Failed to load FAQs');
    } finally {
      loading.value = false;
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
      display_order: 0,
      is_active: true,
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
      display_order: faq.display_order,
      is_active: faq.is_active,
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
      if (editingFAQ.value) {
        await axios.put(`${apiConfig.baseURL}/faqs/${editingFAQ.value.id}`, faqForm.value);
        showToast('success', 'FAQ updated successfully');
      } else {
        await axios.post(`${apiConfig.baseURL}/faqs`, faqForm.value);
        showToast('success', 'FAQ created successfully');
      }
      await loadFAQs();
      await loadStats();
      await loadCategories();
      closeModal();
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
</style>