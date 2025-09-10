<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useBranchStore } from '../../stores/branchStore';
  import { useUserStore } from '../../stores/userStore';
  import { useThemeStore } from '../../stores/themeStore';
  import { openaiService } from '../../services/openaiService';
  import { apiConfig } from '../../config/api.js';
  import {
    Plus,
    Building2,
    CheckCircle,
    XCircle,
    Users,
    Search,
    RefreshCw,
    AlertCircle,
    X,
    Eye,
    Edit,
    Trash2,
    Phone,
    Mail,
    MapPin,
  } from 'lucide-vue-next';

  const branchStore = useBranchStore();
  const userStore = useUserStore();
  const themeStore = useThemeStore();

  // Reactive data
  const searchQuery = ref('');
  const statusFilter = ref('all');
  const editingBranch = ref(null);
  const selectedBranch = ref(null);
  const branchUsers = ref([]);
  const grammarLoading = ref(false);
  const formLoading = ref(false);

  // Toast state (following EmployeeManager pattern)
  const toast = ref({ show: false, type: 'success', message: '' });
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => (toast.value.show = false), 3000);
  };

  // Confirm modal state
  const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false,
  });

  const openConfirm = (title, message, onConfirm) => {
    confirmModal.value = { show: true, title, message, onConfirm };
    document.getElementById('confirm_modal')?.showModal();
  };

  const closeConfirm = () => {
    document.getElementById('confirm_modal')?.close();
    confirmModal.value = {
      show: false,
      title: '',
      message: '',
      onConfirm: null,
      loading: false,
    };
  };

  // Modal refs
  const branchModal = ref(null);
  const usersModal = ref(null);
  const googleMapsModal = ref(null);

  // OpenStreetMap (Leaflet) related data
  const locationSearch = ref('');
  const selectedAddress = ref('');
  const mapContainer = ref(null);
  const map = ref(null);
  const marker = ref(null);

  // Statistics
  const branchStats = computed(() => branchStore.stats);

  // Form data
  const branchForm = ref({
    name: '',
    address: '',
    manager_id: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_active: true,
    description: '',
  });

  // Computed properties
  const filteredBranches = computed(() => {
    let branches = branchStore.branches;

    // Filter by status
    if (statusFilter.value === 'active') {
      branches = branches.filter((branch) => branch.is_active);
    } else if (statusFilter.value === 'inactive') {
      branches = branches.filter((branch) => !branch.is_active);
    }

    // Filter by search query
    if (searchQuery.value.trim()) {
      branches = branchStore.searchBranches(searchQuery.value);
    }

    return branches;
  });

  // Employee-related computed properties
  const availableEmployees = ref([]);
  const selectedManager = computed(() => {
    if (!branchForm.value.manager_id) return null;
    return availableEmployees.value.find(
      (employee) => employee.id == branchForm.value.manager_id
    );
  });

  // Methods
  const updateManagerInfo = () => {
    // This method is called when manager selection changes
    // The selectedManager computed property will automatically update
  };

  const loadBranchManagers = async () => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/branches/managers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      availableEmployees.value = data;
    } catch (error) {
      console.error('Failed to load branch managers:', error);
      availableEmployees.value = [];
    }
  };

  // AI-powered grammar correction function for description
  const correctDescription = async () => {
    if (!branchForm.value.description?.trim()) return;

    grammarLoading.value = true;
    try {
      // Try OpenAI first
      try {
        const correctedText = await openaiService.correctGrammar(
          branchForm.value.description,
          'branch'
        );

        branchForm.value.description = correctedText;
        console.log('✨ OpenAI AI grammar correction applied successfully!');
        return;
      } catch (openaiError) {
        console.log(
          '🤖 OpenAI correction failed, trying LanguageTool:',
          openaiError.message
        );

        // Try LanguageTool as second option
        try {
          const correctedText =
            await openaiService.correctGrammarWithLanguageTool(
              branchForm.value.description
            );

          branchForm.value.description = correctedText;
          console.log(
            '🔧 LanguageTool grammar correction applied successfully!'
          );

          // Show user feedback about LanguageTool
          showToast(
            'info',
            '🔧 OpenAI unavailable. Applied LanguageTool correction instead.'
          );
          return;
        } catch (languageToolError) {
          console.log(
            '🔧 LanguageTool correction failed, using local fallback:',
            languageToolError.message
          );

          // Final fallback to local correction
          let correctedText = branchForm.value.description;

          // Basic cleanup and improvements
          correctedText = correctedText
            .replace(/\s+/g, ' ') // Multiple spaces to single
            .trim()
            // Fix spacing around punctuation
            .replace(/\s+([,.!?;:)])/g, '$1')
            .replace(/([,.!?;:])\s*([a-zA-Z])/g, '$1 $2')
            .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
            // Fix quotes and apostrophes
            .replace(/\s*[""]\s*/g, '"')
            .replace(/\s*['']\s*/g, "'")
            .replace(/(\w)\s+'\s*(\w)/g, "$1'$2")
            // Capitalization
            .replace(/^[a-z]/, (match) => match.toUpperCase())
            .replace(
              /([.!?]\s+)([a-z])/g,
              (match, punct, letter) => punct + letter.toUpperCase()
            )
            .replace(/\bi\b/g, 'I')
            // Common contractions
            .replace(/\bcan\s*t\b/gi, "can't")
            .replace(/\bdon\s*t\b/gi, "don't")
            .replace(/\bwon\s*t\b/gi, "won't")
            .replace(/\bit\s*s\b/gi, "it's")
            .replace(/\byou\s*re\b/gi, "you're")
            // Common mistakes
            .replace(/\ba\s+([aeiouAEIOU])/g, 'an $1')
            .replace(/\ban\s+([^aeiouAEIOU])/g, 'a $1')
            .replace(/\balot\b/gi, 'a lot')
            .replace(/\bteh\b/gi, 'the')
            // Business terms
            .replace(/\bcustomer\s+service\b/gi, 'customer service')
            .replace(/\bbranch\s+office\b/gi, 'branch office')
            .replace(/\batm\s+services?\b/gi, 'ATM services')
            // Final cleanup
            .replace(/\s+/g, ' ')
            .trim();

          // Smart sentence ending
          if (correctedText && !correctedText.match(/[.!?]$/)) {
            if (
              correctedText.length > 10 &&
              (correctedText.includes(' is ') ||
                correctedText.includes(' provides ') ||
                correctedText.includes(' offers ') ||
                correctedText.includes(' serves '))
            ) {
              correctedText += '.';
            }
          }

          branchForm.value.description = correctedText;
          console.log(
            '📝 Local fallback grammar correction applied successfully!'
          );

          // Show user feedback about local fallback
          showToast(
            'info',
            '📝 Both AI services unavailable. Applied local correction instead.'
          );
        }
      }
    } catch (error) {
      console.error('Failed to correct description:', error);
      showToast('error', 'Grammar correction failed. Please try again.');
    } finally {
      grammarLoading.value = false;
    }
  };

  // Google Maps integration
  const openGoogleMaps = () => {
    // Pre-fill search with current address if available
    if (branchForm.value.address) {
      locationSearch.value = branchForm.value.address;
    }

    // Reset selected address
    selectedAddress.value = '';

    // Open the modal
    googleMapsModal.value.showModal();

    // Initialize map after modal opens
    setTimeout(() => {
      initMap();
    }, 100);
  };

  // Initialize OpenStreetMap with Leaflet
  const initMap = () => {
    if (!mapContainer.value || map.value) return;

    try {
      // Create map instance using Leaflet
      map.value = L.map(mapContainer.value).setView([14.5995, 120.9842], 12); // Default to Manila, Philippines

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map.value);

      // Add click listener to map
      map.value.on('click', (event) => {
        placeMarker(event.latlng);
      });

      // If there's a search query, search for it
      if (locationSearch.value.trim()) {
        searchLocation();
      }
    } catch (error) {
      console.error('Failed to initialize map:', error);
      // Fallback: show error message
      mapContainer.value.innerHTML = `
        <div class="flex items-center justify-center h-full bg-red-50 text-red-600">
          <div class="text-center">
            <div class="text-4xl mb-2">❌</div>
            <p class="font-medium">Map failed to load</p>
            <p class="text-sm">Please search manually or enter address directly</p>
          </div>
        </div>
      `;
    }
  };

  // Search location using Nominatim (OpenStreetMap geocoding)
  const searchLocation = async () => {
    if (!locationSearch.value.trim()) return;

    try {
      // Show loading state
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div class="flex items-center justify-center h-full bg-blue-50 text-blue-600">
          <div class="text-center">
            <div class="loading loading-spinner loading-lg mb-2"></div>
            <p class="font-medium">Searching...</p>
          </div>
        </div>
      `;
      mapContainer.value.appendChild(loadingDiv);

      // Search using Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch.value)}&limit=1&addressdetails=1`
      );

      if (response.ok) {
        const results = await response.json();

        if (results.length > 0) {
          const location = results[0];
          const lat = parseFloat(location.lat);
          const lon = parseFloat(location.lon);

          // Center map on search result
          map.value.setView([lat, lon], 16);

          // Place marker
          placeMarker({ lat, lng: lon });

          // Update selected address
          selectedAddress.value = location.display_name;

          // Auto-populate individual address fields
          if (location.address) {
            // Update form fields with parsed address components
            branchForm.value.city =
              location.address.city ||
              location.address.town ||
              location.address.village ||
              location.address.county ||
              '';
            branchForm.value.state =
              location.address.state || location.address.province || '';
            branchForm.value.postal_code = location.address.postcode || '';
            branchForm.value.country = location.address.country || '';
          }

          // Remove loading state
          mapContainer.value.removeChild(loadingDiv);
        } else {
          // Remove loading state
          mapContainer.value.removeChild(loadingDiv);
          showToast(
            'warning',
            `Location not found: "${locationSearch.value}". Please try a different search term or enter the address manually.`
          );
        }
      } else {
        throw new Error('Search request failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      showToast(
        'error',
        `Search failed: ${error.message}. Please try again or enter the address manually.`
      );

      // Remove loading state if it exists
      const loadingDiv = mapContainer.value.querySelector('.loading');
      if (loadingDiv) {
        mapContainer.value.removeChild(loadingDiv);
      }
    }
  };

  // Apply the selected address to the form
  const applySelectedAddress = () => {
    if (selectedAddress.value.trim()) {
      branchForm.value.address = selectedAddress.value.trim();

      // If we have individual address components, use them
      // (These are already populated by placeMarker function)
      // If not, try to parse the address manually
      if (!branchForm.value.city && selectedAddress.value.includes(',')) {
        const addressParts = selectedAddress.value
          .split(',')
          .map((part) => part.trim());

        // Simple parsing logic for common address formats
        if (addressParts.length >= 4) {
          // Format: Street, City, State, Postal Code, Country
          branchForm.value.city = addressParts[1] || '';
          branchForm.value.state = addressParts[2] || '';
          branchForm.value.postal_code = addressParts[3] || '';
          branchForm.value.country =
            addressParts[4] || addressParts[addressParts.length - 1] || '';
        }
      }

      closeGoogleMapsModal();

      // Show success message
      showToast(
        'success',
        '✅ Address and location details applied successfully!'
      );
    }
  };

  // Close Google Maps modal
  const closeGoogleMapsModal = () => {
    googleMapsModal.value.close();
    locationSearch.value = '';
    selectedAddress.value = '';

    // Clean up map resources
    if (marker.value) {
      map.value?.removeLayer(marker.value);
      marker.value = null;
    }
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  };

  // Place marker on map and get address
  const placeMarker = async (latLng) => {
    if (!map.value) return;

    // Remove existing marker
    if (marker.value) {
      map.value.removeLayer(marker.value);
    }

    // Create new marker using Leaflet
    marker.value = L.marker([latLng.lat, latLng.lng], {
      draggable: true,
      title: 'Branch Location',
    }).addTo(map.value);

    // Get address for this location using reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latLng.lat}&lon=${latLng.lng}&zoom=18&addressdetails=1`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          selectedAddress.value = data.display_name;

          // Auto-populate individual address fields
          if (data.address) {
            // Update form fields with parsed address components
            branchForm.value.city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county ||
              '';
            branchForm.value.state =
              data.address.state || data.address.province || '';
            branchForm.value.postal_code = data.address.postcode || '';
            branchForm.value.country = data.address.country || '';
          }
        } else {
          // Fallback to coordinates
          selectedAddress.value = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`;
        }
      } else {
        // Fallback to coordinates
        selectedAddress.value = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`;
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Fallback to coordinates
      selectedAddress.value = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`;
    }

    // Add drag listener to update address when marker is moved
    marker.value.on('dragend', (event) => {
      const newLatLng = event.target.getLatLng();
      placeMarker({ lat: newLatLng.lat, lng: newLatLng.lng });
    });
  };

  // Map control functions
  const centerMap = () => {
    if (marker.value && map.value) {
      const latLng = marker.value.getLatLng();
      map.value.setView(latLng, 16);
    }
  };

  const zoomIn = () => {
    if (map.value) {
      map.value.zoomIn();
    }
  };

  const zoomOut = () => {
    if (map.value) {
      map.value.zoomOut();
    }
  };

  // Get current location using GPS
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast(
        'error',
        'Geolocation is not supported by your browser. Please search manually.'
      );
      return;
    }

    // Show loading state
    showToast(
      'info',
      'Getting your current location... Please allow location access when prompted.'
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Use reverse geocoding to get address from coordinates
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
              selectedAddress.value = data.display_name;

              // Auto-populate individual address fields
              if (data.address) {
                branchForm.value.city =
                  data.address.city ||
                  data.address.town ||
                  data.address.village ||
                  data.address.county ||
                  '';
                branchForm.value.state =
                  data.address.state || data.address.province || '';
                branchForm.value.postal_code = data.address.postcode || '';
                branchForm.value.country = data.address.country || '';
              }

              // Center map on current location
              if (map.value) {
                const latLng = { lat: latitude, lng: longitude };
                map.value.setView([latitude, longitude], 16);
                placeMarker(latLng);
              }

              showToast(
                'success',
                `Location found! Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}. Click "Apply Address" to use this location.`
              );
            } else {
              throw new Error('No address found for this location');
            }
          } else {
            throw new Error('Failed to get address from coordinates');
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          // Fallback: just show coordinates
          selectedAddress.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          // Center map on coordinates
          if (map.value) {
            const latLng = { lat: latitude, lng: longitude };
            map.value.setView([latitude, longitude], 16);
            placeMarker(latLng);
          }

          showToast(
            'warning',
            `Location found! Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}. Please manually enter the address or search for nearby landmarks.`
          );
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get your location.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Location access denied. Please allow location access or search manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              'Location information unavailable. Please search manually.';
            break;
          case error.TIMEOUT:
            errorMessage =
              'Location request timed out. Please try again or search manually.';
            break;
        }

        showToast('error', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Enhanced address validation with coordinates
  const validateAddress = (address) => {
    if (!address || address.trim().length < 10) {
      return 'Address must be at least 10 characters long';
    }

    // Check for common address patterns
    const addressPattern = /^[\w\s,.-]+,\s*[\w\s,.-]+,\s*[\w\s+.-]+$/;
    if (!addressPattern.test(address)) {
      return 'Please use format: Street, City, State/Province';
    }

    return null; // Valid
  };

  const loadBranches = async () => {
    try {
      await branchStore.fetchBranches(true);
      await branchStore.fetchBranchStats();
      showToast('success', 'Branches loaded successfully');
    } catch (error) {
      console.error('Failed to load branches:', error);
      showToast('error', error.message || 'Failed to load branches');
    }
  };

  const openCreateModal = () => {
    editingBranch.value = null;
    resetForm();
    branchModal.value.showModal();
  };

  const editBranch = (branch) => {
    editingBranch.value = branch;
    // Copy branch data but ensure manager_id is properly set
    const branchData = { ...branch };
    // If there's a manager_name but no manager_id, we need to find the employee ID
    if (branchData.manager_name && !branchData.manager_id) {
      const manager = availableEmployees.value.find(
        (employee) =>
          `${employee.first_name} ${employee.last_name}` ===
            branchData.manager_name &&
          employee.email === branchData.manager_email
      );
      if (manager) {
        branchData.manager_id = manager.id;
      }
    }
    Object.assign(branchForm.value, branchData);
    branchModal.value.showModal();
  };

  const closeModal = () => {
    branchModal.value.close();
    resetForm();
  };

  const resetForm = () => {
    branchForm.value = {
      name: '',
      address: '',
      manager_id: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      is_active: true,
      description: '',
    };
  };

  const submitBranch = async () => {
    formLoading.value = true;
    try {
      if (editingBranch.value) {
        await branchStore.updateBranch(
          editingBranch.value.id,
          branchForm.value
        );
        showToast(
          'success',
          `Branch "${branchForm.value.name}" updated successfully`
        );
      } else {
        await branchStore.createBranch(branchForm.value);
        showToast(
          'success',
          `Branch "${branchForm.value.name}" created successfully`
        );
      }

      closeModal();
      await branchStore.fetchBranchStats();
    } catch (error) {
      console.error('Failed to save branch:', error);
      showToast('error', error.message || 'Failed to save branch');
    } finally {
      formLoading.value = false;
    }
  };

  const deleteBranch = async (branch) => {
    openConfirm(
      'Delete Branch',
      `Are you sure you want to delete "${branch.name}"? This action cannot be undone.`,
      async () => {
        try {
          confirmModal.value.loading = true;
          await branchStore.deleteBranch(branch.id);
          await branchStore.fetchBranchStats();
          showToast('success', `Branch "${branch.name}" deleted successfully`);
        } catch (error) {
          console.error('Failed to delete branch:', error);
          showToast('error', error.message || 'Failed to delete branch');
        } finally {
          confirmModal.value.loading = false;
        }
      }
    );
  };

  const toggleBranchStatus = async (branchId) => {
    try {
      await branchStore.toggleBranchStatus(branchId);
      await branchStore.fetchBranchStats();
      showToast('success', 'Branch status updated successfully');
    } catch (error) {
      console.error('Failed to toggle branch status:', error);
      showToast('error', error.message || 'Failed to update branch status');
    }
  };

  const viewBranchUsers = async (branch) => {
    selectedBranch.value = branch;
    try {
      branchUsers.value = await branchStore.fetchBranchUsers(branch.id);
      usersModal.value.showModal();
    } catch (error) {
      console.error('Failed to fetch branch users:', error);
      showToast('error', error.message || 'Failed to fetch branch users');
    }
  };

  const closeUsersModal = () => {
    usersModal.value.close();
    selectedBranch.value = null;
    branchUsers.value = [];
  };

  const formatAddress = (branch) => {
    const parts = [branch.city, branch.state, branch.country].filter(Boolean);
    return parts.join(', ') || 'Address not complete';
  };

  // Lifecycle
  onMounted(() => {
    loadBranches();
    loadBranchManagers();
  });
</script>
<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primaryColor mb-2">
        Branch Management
      </h1>
      <p class="text-base-content/70">
        Manage organization branches and locations
      </p>
    </div>

    <!-- Add Branch Button -->
    <div class="flex justify-end mb-6">
      <button
        @click="openCreateModal"
        class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none"
      >
        <Plus class="w-4 h-4 mr-2" />
        Add Branch
      </button>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-primaryColor">
          <Building2 class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Branches</div>
        <div class="stat-value text-primaryColor">
          {{ branchStats.total_branches }}
        </div>
        <div class="stat-desc">All branches</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-success">
          <CheckCircle class="w-8 h-8" />
        </div>
        <div class="stat-title">Active</div>
        <div class="stat-value text-success">
          {{ branchStats.active_branches }}
        </div>
        <div class="stat-desc">Currently active</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-warning">
          <XCircle class="w-8 h-8" />
        </div>
        <div class="stat-title">Inactive</div>
        <div class="stat-value text-warning">
          {{ branchStats.inactive_branches }}
        </div>
        <div class="stat-desc">Currently inactive</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-secondary">
          <Users class="w-8 h-8" />
        </div>
        <div class="stat-title">Users</div>
        <div class="stat-value text-secondary">
          {{ branchStats.total_users_in_branches }}
        </div>
        <div class="stat-desc">Assigned to branches</div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="flex-1">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 w-4 h-4"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search branches by name, code, city, or manager..."
            class="input input-bordered w-full pl-10"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <select v-model="statusFilter" class="select select-bordered">
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <button
          @click="loadBranches"
          class="btn btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
          :disabled="branchStore.loading"
        >
          <RefreshCw
            class="w-4 h-4 mr-2"
            :class="{ 'animate-spin': branchStore.loading }"
          />
          {{ branchStore.loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="branchStore.loading"
      class="flex justify-center items-center py-12"
    >
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="branchStore.error" class="alert alert-error mb-6">
      <AlertCircle class="w-6 h-6" />
      <span>{{ branchStore.error }}</span>
      <button @click="branchStore.clearError" class="btn btn-sm btn-ghost">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Branches Table -->
    <div
      v-else
      :class="[
        'card shadow-xl transition-colors duration-300',
        themeStore.themeClasses.cardBg,
      ]"
    >
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table
            :class="[
              'table transition-colors duration-300',
              themeStore.isDarkMode ? 'table-zebra-dark' : 'table-zebra',
            ]"
          >
            <thead>
              <tr>
                <th>Branch Info</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Users</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="branch in filteredBranches" :key="branch.id">
                <td>
                  <div>
                    <div class="font-bold">{{ branch.name }}</div>
                    <div class="text-sm text-base-content/70">
                      Code: {{ branch.code }}
                    </div>
                    <div
                      v-if="branch.description"
                      class="text-xs text-base-content/50 mt-1"
                    >
                      {{ branch.description }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="text-sm">
                    <div class="flex items-center gap-1">
                      <MapPin class="w-3 h-3" />
                      <span>{{ formatAddress(branch) }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div v-if="branch.manager_name" class="text-sm">
                    <div class="font-medium">{{ branch.manager_name }}</div>
                    <div
                      v-if="branch.manager_email"
                      class="text-base-content/70"
                    >
                      {{ branch.manager_email }}
                    </div>
                    <div
                      v-if="branch.manager_department"
                      class="text-base-content/50 text-xs"
                    >
                      {{ branch.manager_department }}
                    </div>
                  </div>
                  <div v-else class="text-base-content/50 text-sm">
                    No manager assigned
                  </div>
                </td>
                <td>
                  <div class="text-center">
                    <div class="badge badge-outline">
                      {{ branch.user_count || 0 }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="form-control">
                    <label class="cursor-pointer label">
                      <input
                        type="checkbox"
                        :checked="branch.is_active"
                        @change="toggleBranchStatus(branch.id)"
                        class="toggle"
                      />
                    </label>
                  </div>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button
                      @click="viewBranchUsers(branch)"
                      class="btn btn-ghost btn-sm"
                      title="View Users"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button
                      @click="editBranch(branch)"
                      class="btn btn-ghost btn-sm"
                      title="Edit Branch"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      @click="deleteBranch(branch)"
                      class="btn btn-ghost btn-sm text-error"
                      title="Delete Branch"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredBranches.length === 0" class="text-center py-12">
          <Building2 class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 class="text-lg font-medium text-base-content/70 mb-2">
            No branches found
          </h3>
          <p class="text-base-content/50 mb-4">
            {{
              searchQuery
                ? 'Try adjusting your search criteria'
                : 'Get started by creating your first branch'
            }}
          </p>
          <button
            v-if="!searchQuery"
            @click="openCreateModal"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none"
          >
            <Plus class="w-4 h-4 mr-2" />
            Add First Branch
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog ref="branchModal" class="modal">
      <div
        class="modal-box bg-accentColor text-black/50 shadow-lg w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <h3 class="font-bold text-lg mb-4">
          {{ editingBranch ? 'Edit Branch' : 'Create New Branch' }}
        </h3>

        <form @submit.prevent="submitBranch" class="space-y-6">
          <!-- Basic Information Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- Branch Name -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Branch Name <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="branchForm.name"
                type="text"
                placeholder="Enter branch name"
                class="input input-sm sm:input-md input-bordered w-full"
                required
              />
            </div>

            <!-- Auto-generated Branch Code (Read-only) -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Branch Code</span>
                <span class="text-xs text-gray-500 ml-2">(Auto-generated)</span>
              </label>
              <input
                :value="
                  editingBranch ? editingBranch.code : 'Will be auto-generated'
                "
                type="text"
                class="input input-sm sm:input-md input-bordered w-full bg-gray-50 cursor-not-allowed"
                readonly
              />
            </div>
          </div>

          <!-- Address Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- Address -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text"
                  >Address <span class="text-red-500">*</span></span
                >
              </label>
              <div class="relative">
                <textarea
                  v-model="branchForm.address"
                  placeholder="Enter complete branch address"
                  class="textarea textarea-bordered w-full min-h-[80px] pr-20"
                  required
                ></textarea>
                <button
                  type="button"
                  @click="openGoogleMaps"
                  class="absolute top-2 right-2 btn btn-xs bg-primaryColor font-thin hover:bg-primaryColor/80 text-white border-none"
                  title="Open map to pin location"
                >
                  <font-awesome-icon icon="fa-solid fa-map" />
                  Map
                </button>
              </div>
            </div>
          </div>

          <!-- Location Details Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- City -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">City</span>
              </label>
              <input
                v-model="branchForm.city"
                type="text"
                placeholder="Enter city"
                class="input input-sm sm:input-md input-bordered w-full"
              />
            </div>

            <!-- State/Province -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">State/Province</span>
              </label>
              <input
                v-model="branchForm.state"
                type="text"
                placeholder="Enter state/province"
                class="input input-sm sm:input-md input-bordered w-full"
              />
            </div>

            <!-- Postal Code -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Postal Code</span>
              </label>
              <input
                v-model="branchForm.postal_code"
                type="text"
                placeholder="Enter postal code"
                class="input input-sm sm:input-md input-bordered w-full"
              />
            </div>

            <!-- Country -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Country</span>
              </label>
              <input
                v-model="branchForm.country"
                type="text"
                placeholder="Enter country"
                class="input input-sm sm:input-md input-bordered w-full"
              />
            </div>
          </div>

          <!-- Manager Information Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="mb-4">
              <h2 class="card-title text-primaryColor text-xl mb-2">
                Manager Information
              </h2>
              <p class="text-sm text-gray-600">
                Select a manager from the Branch department with Manager role.
              </p>
            </div>

            <!-- Manager Selection -->
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Select Manager</span>
              </label>
              <div class="relative">
                <Building2
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <select
                  v-model="branchForm.manager_id"
                  @change="updateManagerInfo"
                  class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor pl-10"
                >
                  <option value="">Choose a manager from employees</option>
                  <option
                    v-for="employee in availableEmployees"
                    :key="employee.id"
                    :value="employee.id"
                  >
                    {{ employee.first_name }} {{ employee.last_name }} - ({{
                      employee.role || 'No Role'
                    }})
                  </option>
                </select>
              </div>
              <span class="text-xs text-gray-500 mt-1"
                >Only employees from Branch department with Manager role are
                shown</span
              >
            </div>

            <!-- Display Selected Manager Info (Read-only) -->
            <div
              v-if="selectedManager"
              class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text font-medium">Manager Name</span>
                </label>
                <input
                  :value="`${selectedManager.first_name} ${selectedManager.last_name}`"
                  type="text"
                  class="input input-sm input-bordered w-full bg-gray-100 text-gray-800"
                  readonly
                />
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text font-medium">Manager Email</span>
                </label>
                <input
                  :value="selectedManager.email"
                  type="email"
                  class="input input-sm input-bordered w-full bg-gray-100 text-gray-800"
                  readonly
                />
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text font-medium">Role</span>
                </label>
                <input
                  :value="selectedManager.role || 'No Role'"
                  type="text"
                  class="input input-sm input-bordered w-full bg-gray-100 text-gray-800"
                  readonly
                />
              </div>
            </div>
          </div>

          <!-- Description Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Description</span>
              </label>
              <div class="relative">
                <textarea
                  v-model="branchForm.description"
                  placeholder="Optional description about this branch..."
                  class="textarea textarea-bordered w-full min-h-[80px] pr-20"
                ></textarea>
                <button
                  type="button"
                  @click="correctDescription"
                  :disabled="!branchForm.description || grammarLoading"
                  class="absolute top-2 right-2 btn btn-xs bg-primaryColor text-white hover:bg-primaryColor/80 border-none"
                  title="Auto Correction"
                >
                  <span
                    v-if="grammarLoading"
                    class="loading loading-spinner loading-xs"
                  ></span>
                  <span v-else>✓</span>
                  Auto Correction
                </button>
              </div>
            </div>
          </div>

          <!-- Status Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span class="label-text">Branch Status</span>
              </label>
              <div class="flex gap-4 mt-2">
                <label class="label cursor-pointer">
                  <input
                    v-model="branchForm.is_active"
                    type="radio"
                    :value="true"
                    class="radio checked:text-primaryColor radio-sm border-black/50"
                  />
                  <span class="label-text ml-2">Active</span>
                </label>
                <label class="label cursor-pointer">
                  <input
                    v-model="branchForm.is_active"
                    type="radio"
                    :value="false"
                    class="radio checked:text-primaryColor radio-sm border-black/50"
                  />
                  <span class="label-text ml-2">Inactive</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-200"
          >
            <div class="text-sm text-gray-600">
              <span class="font-medium">Branch Management:</span>
              {{ editingBranch ? 'Edit existing branch' : 'Create new branch' }}
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                @click="closeModal"
                class="btn btn-outline btn-sm text-gray-600 hover:bg-gray-100 font-thin"
                :disabled="branchStore.loading"
              >
                <X class="w-4 h-4 mr-1" />
                Cancel
              </button>

              <button
                type="submit"
                class="btn btn-primary btn-sm bg-primaryColor hover:bg-primaryColor/90 font-thin border-none shadow-none"
                :disabled="branchStore.loading || formLoading"
              >
                <span
                  v-if="branchStore.loading || formLoading"
                  class="loading loading-spinner loading-sm"
                ></span>
                {{
                  formLoading
                    ? editingBranch
                      ? 'Updating...'
                      : 'Creating...'
                    : editingBranch
                      ? 'Update Branch'
                      : 'Create Branch'
                }}
              </button>
            </div>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Users Modal -->
    <dialog ref="usersModal" class="modal">
      <div
        :class="[
          'modal-box w-11/12 max-w-2xl transition-colors duration-300',
          themeStore.themeClasses.modal,
        ]"
      >
        <h3 class="font-bold text-lg mb-4">
          Users in {{ selectedBranch?.name }}
        </h3>

        <div v-if="branchUsers.length > 0" class="space-y-2">
          <div
            v-for="user in branchUsers"
            :key="user.id"
            class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
          >
            <div>
              <div class="font-medium">{{ user.name }}</div>
              <div class="text-sm text-base-content/70">{{ user.email }}</div>
            </div>
            <div class="badge badge-outline">
              {{ user.role?.name || 'No Role' }}
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <Users class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p class="text-base-content/70">No users assigned to this branch</p>
        </div>

        <div class="modal-action">
          <button @click="closeUsersModal" class="btn">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeUsersModal">close</button>
      </form>
    </dialog>

    <!-- Google Maps Modal -->
    <dialog ref="googleMapsModal" class="modal">
      <div :class="['modal-box max-w-4xl', themeStore.themeClasses.modal]">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-map" /> Location Picker
          (OpenStreetMap)
        </h3>

        <div class="mb-4">
          <label class="label pb-2">
            <span
              :class="[
                'label-text font-medium',
                themeStore.themeClasses.textSecondary,
              ]"
              >Search Location</span
            >
          </label>
          <div class="flex gap-2 mb-3">
            <input
              v-model="locationSearch"
              :class="[
                'input input-bordered flex-1 transition-colors duration-300',
                themeStore.themeClasses.input,
              ]"
              placeholder="Search for business location, landmark, or address..."
              @keyup.enter="searchLocation"
            />
            <div class="flex gap-2 justify-end items-center">
              <button
                @click="searchLocation"
                class="btn btn-sm bg-gray-200 font-thin hover:bg-gray-300 text-gray-700 border-none"
              >
                <font-awesome-icon icon="fa-solid fa-search" />
                Search
              </button>
              <button
                @click="getCurrentLocation"
                class="btn btn-sm bg-primaryColor font-thin hover:bg-primaryColor/80 text-white border-none"
                title="Get your current location"
              >
                <font-awesome-icon icon="fa-solid fa-location-dot" />
                Current
              </button>
            </div>
          </div>

          <!-- Embedded Google Maps -->
          <div class="relative">
            <div
              ref="mapContainer"
              class="w-full h-80 bg-gray-200 rounded-lg border-2 border-primaryColor/30 overflow-hidden"
            >
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-gray-600">
                  <div class="text-4xl mb-2">🗺️</div>
                  <p class="font-medium">Map will load here</p>
                  <p class="text-sm">Search for a location to see the map</p>
                </div>
              </div>
            </div>

            <!-- Map Controls Overlay -->
            <div class="absolute top-2 right-2 flex flex-col gap-2">
              <button
                @click="centerMap"
                class="btn btn-xs bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-md"
                title="Center map"
              >
                <font-awesome-icon icon="fa-solid fa-bullseye" />
              </button>
              <button
                @click="zoomIn"
                class="btn btn-xs bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-md"
                title="Zoom in"
              >
                <font-awesome-icon icon="fa-solid fa-plus" />
              </button>
              <button
                @click="zoomOut"
                class="btn btn-xs bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-md"
                title="Zoom out"
              >
                <font-awesome-icon icon="fa-solid fa-minus" />
              </button>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <div
            class="bg-primaryColor/10 p-4 rounded-lg border border-primaryColor/30"
          >
            <h4 class="font-medium mb-2 text-primaryColor">
              <font-awesome-icon icon="fa-solid fa-location-dot" />
              How to Use the Map:
            </h4>
            <ol
              class="list-decimal list-inside space-y-1 text-sm text-primaryColor"
            >
              <li>Search for your branch location above</li>
              <li>Click on the exact spot on the map</li>
              <li>The address will automatically appear below</li>
              <li>Click "Apply Address" to use this location</li>
            </ol>
          </div>
        </div>

        <div class="mb-4">
          <label class="label pb-2">
            <span
              :class="[
                'label-text font-medium',
                themeStore.themeClasses.textSecondary,
              ]"
              >Selected Address</span
            >
          </label>
          <textarea
            v-model="selectedAddress"
            :class="[
              'textarea textarea-bordered w-full transition-colors duration-300',
              themeStore.themeClasses.input,
            ]"
            rows="3"
            placeholder="Paste the address from Google Maps here..."
          ></textarea>
        </div>

        <div class="modal-action">
          <button
            class="btn btn-outline font-thin btn-sm text-black/50 border-none hover:bg-gray-100"
            @click="closeGoogleMapsModal"
          >
            Cancel
          </button>
          <button
            class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/80 border-none font-thin"
            @click="applySelectedAddress"
            :disabled="!selectedAddress.trim()"
          >
            <font-awesome-icon icon="fa-solid fa-check" /> Apply Address
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeGoogleMapsModal">close</button>
      </form>
    </dialog>

    <!-- Toast Notification -->
    <transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transform transition ease-in duration-300"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div class="toast toast-end z-[100000]" v-if="toast.show">
        <div
          v-if="toast.type === 'success'"
          class="alert alert-success shadow-lg max-w-xs sm:max-w-sm"
        >
          <span class="text-xs sm:text-sm">{{ toast.message }}</span>
        </div>
        <div
          v-else-if="toast.type === 'error'"
          class="alert alert-error shadow-lg max-w-xs sm:max-w-sm"
        >
          <span class="text-xs sm:text-sm">{{ toast.message }}</span>
        </div>
        <div
          v-else-if="toast.type === 'warning'"
          class="alert alert-warning shadow-lg max-w-xs sm:max-w-sm"
        >
          <span class="text-xs sm:text-sm">{{ toast.message }}</span>
        </div>
        <div
          v-else-if="toast.type === 'info'"
          class="alert alert-info shadow-lg max-w-xs sm:max-w-sm"
        >
          <span class="text-xs sm:text-sm">{{ toast.message }}</span>
        </div>
      </div>
    </transition>

    <!-- Confirmation Modal -->
    <dialog id="confirm_modal" class="modal">
      <div class="modal-box bg-accentColor text-black/70">
        <h3 class="font-bold text-lg mb-2">{{ confirmModal.title }}</h3>
        <p class="py-2">{{ confirmModal.message }}</p>
        <div class="modal-action">
          <button
            class="btn btn-sm border-none shadow-none font-thin"
            @click="closeConfirm"
            :disabled="confirmModal.loading"
          >
            Cancel
          </button>
          <button
            class="btn btn-sm bg-primaryColor text-white border-none font-thin"
            @click="confirmModal.onConfirm"
            :disabled="confirmModal.loading"
          >
            <span
              v-if="confirmModal.loading"
              class="loading loading-spinner loading-xs"
            ></span>
            {{ confirmModal.loading ? 'Processing...' : 'Confirm' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeConfirm">close</button>
      </form>
    </dialog>
  </div>
</template>
