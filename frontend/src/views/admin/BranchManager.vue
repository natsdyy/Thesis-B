<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useBranchStore } from '../../stores/branchStore';
  import { useUserStore } from '../../stores/userStore';
  import { useThemeStore } from '../../stores/themeStore';
  import { useAuthStore } from '../../stores/authStore';
  import { openaiService } from '../../services/openaiService';
  import { apiConfig } from '../../config/api.js';
  import {
    Plus,
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
    EllipsisVertical,
    BadgeCheck,
    UserCheck,
    Building2,
  } from 'lucide-vue-next';

  const branchStore = useBranchStore();
  const userStore = useUserStore();
  const themeStore = useThemeStore();
  const authStore = useAuthStore();

  // Reactive data
  const searchQuery = ref('');
  const statusFilter = ref('all');
  const editingBranch = ref(null);
  const selectedBranch = ref(null);
  const branchEmployees = ref([]);
  const grammarLoading = ref(false);
  const formLoading = ref(false);
  const showDeletedBranches = ref(false);

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
  };

  const closeConfirm = () => {
    confirmModal.value = {
      show: false,
      title: '',
      message: '',
      onConfirm: null,
      loading: false,
    };
  };

  // Modal refs
  const branchModal = ref(false);
  const employeesModal = ref(false);
  const googleMapsModal = ref(false);

  // OpenStreetMap (Leaflet) related data
  const locationSearch = ref('');
  const selectedAddress = ref('');
  const selectedLat = ref(null);
  const selectedLng = ref(null);
  const manualLat = ref(null);
  const manualLng = ref(null);
  const mapContainer = ref(null);
  const map = ref(null);
  const marker = ref(null);
  const countrysideMarkers = ref([]);

  // Autocomplete state for OpenStreetMap (Nominatim)
  const isSearching = ref(false);
  const suggestions = ref([]);
  const showSuggestions = ref(false);

  // Simple debounce utility for input-driven fetches
  const debounce = (fn, wait = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  // Cavite-only geocoding bounds (left, top, right, bottom)
  // These coordinates cover Cavite province generously
  const CAVITE_BOUNDS = {
    left: 120.6, // min lon
    top: 14.6, // max lat
    right: 121.1, // max lon
    bottom: 13.8, // min lat
  };

  const buildSearchUrl = (q, limit = 10) => {
    const { left, top, right, bottom } = CAVITE_BOUNDS;
    return (
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}` +
      `&limit=${limit}&addressdetails=1&countrycodes=ph&dedupe=1` +
      `&viewbox=${left},${top},${right},${bottom}&bounded=1`
    );
  };

  // Statistics
  const branchStats = computed(() => branchStore.stats);

  // Check if user is Board Director
  const isBoardDirector = computed(() => authStore.isBoardDirector);

  // Form data
  const branchForm = ref({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_active: true,
    description: '',
    image_url: '',
    latitude: null,
    longitude: null,
    radius_meters: 2,
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

  // Methods

  const statusBadgeClass = (isActive, isDeleted = false) => {
    if (isDeleted) {
      return 'badge-sm border-none bg-gray-500/20 text-gray-500';
    }
    return isActive
      ? 'badge-sm border-none bg-success/20 text-success'
      : 'badge-sm border-none bg-error/20 text-error';
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

    // Pre-fill manual coordinates if available
    if (branchForm.value.latitude && branchForm.value.longitude) {
      manualLat.value = branchForm.value.latitude;
      manualLng.value = branchForm.value.longitude;
      selectedLat.value = branchForm.value.latitude;
      selectedLng.value = branchForm.value.longitude;
    }

    // Reset selected address
    selectedAddress.value = '';

    // Open the modal
    googleMapsModal.value = true;

    // Initialize map after modal opens
    setTimeout(() => {
      initMap();
      // If we have existing coordinates, place marker on map
      if (
        Number.isFinite(branchForm.value.latitude) &&
        Number.isFinite(branchForm.value.longitude)
      ) {
        placeMarker(
          {
            lat: branchForm.value.latitude,
            lng: branchForm.value.longitude,
          },
          false,
          { preserveSelectedAddress: true }
        );
      }
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
        showToast('info', 'Fetching address for selected point...');
        placeMarker(event.latlng, true);
      });

      // Load and display Countryside Steakhouse locations after a short delay
      setTimeout(() => {
        loadCountrysideLocations();
      }, 500);

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

  // Load all Countryside Steakhouse locations in Cavite
  const loadCountrysideLocations = async () => {
    if (!map.value) {
      console.log('Map not initialized yet, skipping Countryside locations');
      return;
    }

    try {
      console.log('Loading Countryside Steakhouse locations...');

      // Hardcoded Countryside Steakhouse locations with geocoded coordinates
      const countrysideLocations = [
        {
          name: 'Countryside Steakhouse Tanza',
          address: '9VV3+6CR, Tanza, Cavite',
          lat: 14.4056,
          lng: 120.8531,
        },
        {
          name: 'Countryside Steakhouse Malihan',
          address: '14 Malihan St, Dasmariñas, 4114 Cavite',
          lat: 14.3297,
          lng: 120.9369,
        },
        {
          name: 'Countryside Steakhouse Silang',
          address: '6XFF+XMX, Silang, 4118 Cavite',
          lat: 14.2306,
          lng: 120.9742,
        },
        {
          name: 'Countryside Burgerhouse Cantimbuhan',
          address:
            'Zone 4, Cantimbuhan Building, Cantimbuhan St, Poblacion, Dasmariñas, 4114 Cavite',
          lat: 14.3297,
          lng: 120.9369,
        },
        {
          name: 'Countryside Steakhouse Noveleta',
          address: 'Lotto Bldg Dr. J, M. Salud Rd, Noveleta, Cavite',
          lat: 14.4292,
          lng: 120.8769,
        },
        {
          name: 'Countryside Steakhouse - P & N Countryside Steakhouse',
          address:
            'CW7R+8GJ, Ground Floor Robinson Place Imus, Imus, 4103 Cavite',
          lat: 14.4297,
          lng: 120.9369,
        },
        {
          name: 'Countryside Steakhouse Poblacion Imus',
          address:
            'Castaneda Street, Imus Branch, Carsadang Bago, Imus, Cavite',
          lat: 14.4297,
          lng: 120.9369,
        },
        {
          name: 'Countryside Binakayan',
          address: 'Riverside Building, Covelandia Rd, Kawit, Cavite',
          lat: 14.4442,
          lng: 120.9019,
        },
        {
          name: 'Countryside Steakhouse Burol Main',
          address: 'Congressional Rd, Dasmariñas, Cavite',
          lat: 14.3297,
          lng: 120.9369,
        },
      ];

      // Clear existing markers first
      countrysideMarkers.value.forEach((marker) => {
        if (map.value) {
          map.value.removeLayer(marker);
        }
      });
      countrysideMarkers.value = [];

      // Add markers for each location
      countrysideLocations.forEach((location, index) => {
        console.log(
          `Adding marker for ${location.name} at ${location.lat}, ${location.lng}`
        );

        let marker;

        try {
          // Create custom icon for Countryside Steakhouse
          const customIcon = L.divIcon({
            className: 'countryside-marker',
            html: `
              <div style="
                background: #dc2626;
                color: white;
                border: 2px solid white;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">CS</div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15],
          });

          marker = L.marker([location.lat, location.lng], { icon: customIcon });
        } catch (iconError) {
          console.warn('Custom icon failed, using default marker:', iconError);
          // Fallback to default marker with red color
          marker = L.marker([location.lat, location.lng], {
            icon: L.icon({
              iconUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-red.png',
              shadowUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            }),
          });
        }

        marker.addTo(map.value).bindPopup(`
            <div style="min-width: 250px;">
              <h3 style="margin: 0 0 8px 0; color: #dc2626; font-weight: bold;">
                🥩 ${location.name}
              </h3>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #333;">
                ${location.address}
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                Branch #${index + 1} • Cavite, Philippines
              </p>
            </div>
          `);

        countrysideMarkers.value.push(marker);
      });

      console.log(
        `Successfully added ${countrysideMarkers.value.length} Countryside markers to map`
      );
      showToast(
        'success',
        `Loaded ${countrysideLocations.length} Countryside Steakhouse locations in Cavite`
      );
    } catch (error) {
      console.error('Failed to load Countryside locations:', error);
      showToast('warning', 'Could not load existing Countryside locations');
    }
  };

  // Search location using Nominatim (OpenStreetMap geocoding)
  const searchLocation = async () => {
    if (!locationSearch.value.trim()) return;

    try {
      isSearching.value = true;
      showSuggestions.value = true;

      // Prefer exact match if available; fetch top candidates
      const url = buildSearchUrl(locationSearch.value, 10);
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });

      if (!response.ok) throw new Error('Search request failed');
      let results = await response.json();
      // Hard-filter to Cavite province just in case
      results = results.filter((r) => {
        const a = r.address || {};
        return (
          (a.state && String(a.state).toLowerCase().includes('cavite')) ||
          (a.province && String(a.province).toLowerCase().includes('cavite')) ||
          (r.display_name &&
            String(r.display_name).toLowerCase().includes('cavite'))
        );
      });
      suggestions.value = results.map((r) => ({
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        display_name: r.display_name,
        address: r.address || {},
        type: r.type,
        class: r.class,
      }));

      // Rank results to prefer administrative areas (e.g., barangay/city) matching the query
      const ranked = rankSuggestions(locationSearch.value, suggestions.value);
      suggestions.value = ranked;

      const candidate = ranked[0];
      if (candidate) {
        await selectSuggestion(candidate);
      } else {
        showToast('warning', `No results for "${locationSearch.value}"`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      showToast('error', `Search failed: ${error.message}`);
    } finally {
      isSearching.value = false;
    }
  };

  // Fetch suggestions as user types (debounced)
  const fetchSuggestions = debounce(async () => {
    const q = locationSearch.value.trim();
    if (!q) {
      suggestions.value = [];
      showSuggestions.value = false;
      return;
    }
    try {
      const url = buildSearchUrl(q, 10);
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) return;
      let data = await res.json();
      data = data.filter((r) => {
        const a = r.address || {};
        return (
          (a.state && String(a.state).toLowerCase().includes('cavite')) ||
          (a.province && String(a.province).toLowerCase().includes('cavite')) ||
          (r.display_name &&
            String(r.display_name).toLowerCase().includes('cavite'))
        );
      });
      const mapped = data.map((r) => ({
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        display_name: r.display_name,
        address: r.address || {},
        type: r.type,
        class: r.class,
      }));
      suggestions.value = rankSuggestions(locationSearch.value, mapped);
      showSuggestions.value = suggestions.value.length > 0;
    } catch (_) {
      // ignore transient failures
    }
  }, 350);

  const onSearchInput = () => {
    showSuggestions.value = true;
    fetchSuggestions();
  };

  const selectSuggestion = async (item) => {
    // Center and drop marker
    if (map.value) {
      map.value.setView([item.lat, item.lon], 16);
    }
    // Place marker but preserve our formatted address (avoid overwriting with POI-rich reverse geocode)
    placeMarker({ lat: item.lat, lng: item.lon }, true, {
      preserveSelectedAddress: true,
    });
    selectedAddress.value = formatSuggestionAddress(item, locationSearch.value);

    // Populate form fields
    const a = item.address || {};
    branchForm.value.city = a.city || a.town || a.village || a.county || '';
    branchForm.value.state = a.state || a.province || '';
    branchForm.value.postal_code = a.postcode || '';
    branchForm.value.country = a.country || '';

    // Hide suggestions after selection
    showSuggestions.value = false;
  };

  // Display helpers for suggestion list
  const getSuggestionTitle = (s) => {
    const a = s.address || {};
    const name = s.display_name || '';

    // If it's a Countryside Steakhouse, show it prominently
    if (
      name.toLowerCase().includes('countryside') &&
      name.toLowerCase().includes('steakhouse')
    ) {
      return name;
    }

    return a.village || a.suburb || a.neighbourhood || a.town || a.city || name;
  };

  const getSuggestionSubtitle = (s) => {
    const a = s.address || {};
    const city = a.city || a.town;
    const province = a.state || a.province;
    const country = a.country;
    return [city, province, country].filter(Boolean).join(', ');
  };

  const highlightMatch = (text) => {
    const q = locationSearch.value.trim();
    if (!q) return text;
    const re = new RegExp(
      `(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`,
      'ig'
    );
    return text.replace(re, '<span class="font-semibold">$1</span>');
  };

  // Utilities: rank and format results to prefer exact Salawag-like matches
  const rankSuggestions = (queryText, items) => {
    const q = queryText.trim().toLowerCase();
    const adminTypes = new Set([
      'city',
      'town',
      'village',
      'suburb',
      'neighbourhood',
      'hamlet',
      'municipality',
      'county',
      'province',
    ]);
    const poiClasses = new Set(['amenity', 'shop', 'tourism', 'office']);

    const score = (s) => {
      const name = (s.display_name || '').toLowerCase();
      const a = s.address || {};
      const parts = [
        a.city,
        a.town,
        a.village,
        a.suburb,
        a.neighbourhood,
        a.hamlet,
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());

      let sc = 0;

      // Boost for Countryside Steakhouse matches
      if (name.includes('countryside') && name.includes('steakhouse'))
        sc += 2000;
      if (name.includes('countryside steakhouse')) sc += 2500;

      // Exact match on any admin field
      if (parts.includes(q)) sc += 1000;
      // Starts with query in display_name
      if (name.startsWith(q + ',')) sc += 600;
      if (name === q) sc += 800;
      // Prefer administrative place types
      if (adminTypes.has(s.type)) sc += 200;
      // Penalize POIs unless exact name match
      if (poiClasses.has(s.class)) sc -= 100;
      // Minor boost if within Cavite/PH (common for your use case)
      if ((a.state || '').toLowerCase().includes('cavite')) sc += 30;
      if ((a.country || '').toLowerCase().includes('philippines')) sc += 10;
      return sc;
    };

    return [...items].sort((a, b) => score(b) - score(a));
  };

  const formatSuggestionAddress = (s, queryText) => {
    const a = s.address || {};
    const namePref =
      a.village || a.suburb || a.neighbourhood || a.town || a.city || queryText;
    const city = a.city || a.town || '';
    const province = a.state || a.province || '';
    const country = a.country || '';
    return [namePref, city, province, country]
      .filter((x) => x && String(x).trim().length > 0)
      .join(', ');
  };

  // Wrapper to ensure toast fires immediately on UI action
  const handleSearchClick = async () => {
    if (!locationSearch.value.trim()) {
      showToast('warning', 'Please enter a location to search.');
      return;
    }
    showToast('info', 'Searching location...');
    await searchLocation();
    // Close suggestions after search selects best candidate
    showSuggestions.value = false;
  };

  // Apply the selected address to the form
  const applySelectedAddress = () => {
    if (selectedAddress.value.trim()) {
      branchForm.value.address = selectedAddress.value.trim();
      // If coordinates were picked on the map or entered manually, include them
      if (
        Number.isFinite(selectedLat.value) &&
        Number.isFinite(selectedLng.value)
      ) {
        branchForm.value.latitude = selectedLat.value;
        branchForm.value.longitude = selectedLng.value;
      } else if (
        Number.isFinite(manualLat.value) &&
        Number.isFinite(manualLng.value)
      ) {
        branchForm.value.latitude = manualLat.value;
        branchForm.value.longitude = manualLng.value;
      }

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

  // Debounce timer for manual coordinate updates
  let coordinateUpdateTimer = null;

  // Update map marker and address when manual coordinates are entered
  const updateCoordinatesFromManual = async () => {
    // Clear previous timer
    if (coordinateUpdateTimer) {
      clearTimeout(coordinateUpdateTimer);
    }

    // Debounce the update to avoid feedback loops
    coordinateUpdateTimer = setTimeout(async () => {
      if (
        Number.isFinite(manualLat.value) &&
        Number.isFinite(manualLng.value) &&
        map.value
      ) {
        const lat = manualLat.value;
        const lng = manualLng.value;
        
        // Validate Philippines bounds
        if (lat >= 4.5 && lat <= 21.1 && lng >= 116.9 && lng <= 127.0) {
          // Only update if different from current selected coordinates
          if (
            !selectedLat.value ||
            !selectedLng.value ||
            Math.abs(selectedLat.value - lat) > 0.0001 ||
            Math.abs(selectedLng.value - lng) > 0.0001
          ) {
            // Update selected coordinates
            selectedLat.value = lat;
            selectedLng.value = lng;
            
            // Get address using reverse geocoding
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'CountrysideSteakhouse/1.0',
                  },
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data.display_name) {
                  // Auto-populate the address field
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
                } else {
                  // Fallback to coordinates if no address found
                  selectedAddress.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                }
              } else {
                // Fallback to coordinates if geocoding fails
                selectedAddress.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
              }
            } catch (error) {
              console.error('Reverse geocoding failed:', error);
              // Fallback to coordinates
              selectedAddress.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
            
            // Update map marker
            placeMarker({ lat, lng }, false, { preserveSelectedAddress: true });
            
            // Show feedback
            showToast(
              'success',
              `Location updated: ${lat.toFixed(6)}, ${lng.toFixed(6)}. Address auto-filled.`
            );
          }
        } else {
          showToast(
            'warning',
            'Coordinates outside Philippines bounds. Please use valid coordinates.'
          );
        }
      }
    }, 800); // 800ms debounce
  };

  // Close Google Maps modal
  const closeGoogleMapsModal = () => {
    googleMapsModal.value = false;
    locationSearch.value = '';
    selectedAddress.value = '';
    selectedLat.value = null;
    selectedLng.value = null;
    manualLat.value = null;
    manualLng.value = null;

    // Clean up map resources
    // Remove Countryside markers
    countrysideMarkers.value.forEach((marker) => {
      if (map.value) {
        map.value.removeLayer(marker);
      }
    });
    countrysideMarkers.value = [];

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
  const placeMarker = async (latLng, notify = false, options = {}) => {
    const preserveSelectedAddress = options.preserveSelectedAddress === true;
    // If map is initialized, maintain marker on the map
    if (map.value) {
      // Remove existing marker
      if (marker.value) {
        map.value.removeLayer(marker.value);
      }

      // Create new marker using Leaflet
      marker.value = L.marker([latLng.lat, latLng.lng], {
        draggable: true,
        title: 'Branch Location',
      }).addTo(map.value);
    }

    // Save selected coordinates
    selectedLat.value = latLng.lat;
    selectedLng.value = latLng.lng;
    // Update manual input fields
    manualLat.value = latLng.lat;
    manualLng.value = latLng.lng;

    // Get address for this location using reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latLng.lat}&lon=${latLng.lng}&zoom=18&addressdetails=1`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          if (!preserveSelectedAddress) {
            selectedAddress.value = data.display_name;
          }

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

    if (notify) {
      showToast(
        'success',
        `Location found! Coordinates: ${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}. Click "Apply Address" to use this location.`
      );
    }

    // Add drag listener to update address when marker is moved (only if map exists)
    if (map.value && marker.value) {
      marker.value.on('dragend', (event) => {
        const newLatLng = event.target.getLatLng();
        placeMarker({ lat: newLatLng.lat, lng: newLatLng.lng }, false);
      });
    }
  };

  // Map control functions
  const centerMap = () => {
    if (marker.value && map.value) {
      const latLng = marker.value.getLatLng();
      map.value.setView(latLng, 16);
    }
  };

  // Reload Countryside markers
  const reloadCountrysideMarkers = () => {
    console.log('Manually reloading Countryside markers...');
    loadCountrysideLocations();
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

              // Save coordinates from current location
              selectedLat.value = latitude;
              selectedLng.value = longitude;
              // Update manual input fields
              manualLat.value = latitude;
              manualLng.value = longitude;

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
          selectedLat.value = latitude;
          selectedLng.value = longitude;

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
      const branches = await branchStore.fetchBranches(
        true,
        showDeletedBranches.value
      );
      console.log('Loaded branches:', branches);
      await branchStore.fetchBranchStats();
      showToast('success', 'Branches loaded successfully');
    } catch (error) {
      console.error('Failed to load branches:', error);
      showToast('error', error.message || 'Failed to load branches');
    }
  };

  // Toggle showing deleted branches
  const toggleDeletedBranches = async () => {
    try {
      await loadBranches();
    } catch (error) {
      console.error('Failed to toggle deleted branches:', error);
      showToast('error', 'Failed to load branches');
    }
  };

  const openCreateModal = () => {
    editingBranch.value = null;
    resetForm();
    branchModal.value = true;
  };

  const editBranch = (branch) => {
    editingBranch.value = branch;
    // Copy branch data
    const branchData = { ...branch };
    Object.assign(branchForm.value, branchData);
    branchModal.value = true;
  };

  const closeModal = () => {
    branchModal.value = false;
    resetForm();
  };

  const resetForm = () => {
    branchForm.value = {
      name: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      is_active: true,
      description: '',
      image_url: '',
      latitude: null,
      longitude: null,
      radius_meters: 2,
    };
  };

  // Handle image file selection and upload
  const onImageFileSelected = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      formLoading.value = true;
      const url = await (
        await import('../../services/branchService')
      ).default.uploadImage(file);
      const base = apiConfig.baseURL || '';
      branchForm.value.image_url = url.startsWith('http')
        ? url
        : `${base}${url}`;
      showToast('success', 'Image uploaded');
    } catch (error) {
      console.error('Image upload failed:', error);
      showToast('error', error.message || 'Image upload failed');
    } finally {
      formLoading.value = false;
    }
  };

  const submitBranch = () => {
    const action = editingBranch.value ? 'update' : 'create';
    const actionText = editingBranch.value ? 'update' : 'create';

    openConfirm(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Branch`,
      `Are you sure you want to ${actionText} the branch "${branchForm.value.name}"?`,
      async () => {
        try {
          confirmModal.value.loading = true;

          // Ensure numeric radius value
          if (branchForm.value.radius_meters !== undefined) {
            const parsed = parseFloat(branchForm.value.radius_meters);
            branchForm.value.radius_meters = Number.isNaN(parsed) ? 2 : parsed;
          }

          if (editingBranch.value) {
            // Build payload; trigger backend auto-geocode when address changes
            const payload = { ...branchForm.value };
            const prevAddr = (editingBranch.value.address || '').trim();
            const nextAddr = (branchForm.value.address || '').trim();
            const hasCoords =
              Number.isFinite(payload.latitude) &&
              Number.isFinite(payload.longitude);
            if (prevAddr !== nextAddr && !hasCoords) {
              payload.auto_geocode = true;
            }
            await branchStore.updateBranch(editingBranch.value.id, payload);
            showToast(
              'success',
              `Branch "${branchForm.value.name}" updated successfully`
            );
          } else {
            const payload = { ...branchForm.value };
            await branchStore.createBranch(payload);
            showToast(
              'success',
              `Branch "${branchForm.value.name}" created successfully`
            );
          }

          closeModal();
          closeConfirm();
          await branchStore.fetchBranchStats();
        } catch (error) {
          console.error('Failed to save branch:', error);
          showToast('error', error.message || 'Failed to save branch');
        } finally {
          confirmModal.value.loading = false;
        }
      }
    );
  };

  const deleteBranch = async (branch) => {
    openConfirm(
      'Delete Branch',
      `Are you sure you want to delete "${branch.name}"? The branch will be soft-deleted and can be restored later.`,
      async () => {
        try {
          confirmModal.value.loading = true;
          await branchStore.deleteBranch(branch.id);
          await branchStore.fetchBranchStats();
          showToast('success', `Branch "${branch.name}" deleted successfully`);
          closeConfirm();
        } catch (error) {
          console.error('Failed to delete branch:', error);
          showToast('error', error.message || 'Failed to delete branch');
        } finally {
          confirmModal.value.loading = false;
        }
      }
    );
  };

  // Restore deleted branch
  const restoreBranch = async (branch) => {
    openConfirm(
      'Restore Branch',
      `Are you sure you want to restore "${branch.name}"? This will remove it from the deleted list and make it active again.`,
      async () => {
        try {
          confirmModal.value.loading = true;
          await branchStore.restoreBranch(branch.id);
          await branchStore.fetchBranchStats();
          showToast('success', `Branch "${branch.name}" restored successfully`);
          closeConfirm();
        } catch (error) {
          console.error('Failed to restore branch:', error);
          showToast('error', error.message || 'Failed to restore branch');
        } finally {
          confirmModal.value.loading = false;
        }
      }
    );
  };

  const toggleBranchStatus = (branchId) => {
    const branch = branchStore.branches.find((b) => b.id === branchId);
    const newStatus = branch?.is_active ? 'inactive' : 'active';

    openConfirm(
      'Update Branch Status',
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} the branch "${branch?.name}"?`,
      async () => {
        try {
          confirmModal.value.loading = true;
          await branchStore.toggleBranchStatus(branchId);
          await branchStore.fetchBranchStats();
          showToast(
            'success',
            `Branch ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
          );
          closeConfirm();
        } catch (error) {
          console.error('Failed to toggle branch status:', error);
          showToast('error', error.message || 'Failed to update branch status');
        } finally {
          confirmModal.value.loading = false;
        }
      }
    );
  };

  const viewBranchEmployees = async (branch) => {
    selectedBranch.value = branch;
    try {
      branchEmployees.value = await branchStore.fetchBranchEmployees(branch.id);
      employeesModal.value = true;
    } catch (error) {
      console.error('Failed to fetch branch employees:', error);
      showToast('error', error.message || 'Failed to fetch branch employees');
    }
  };

  const closeEmployeesModal = () => {
    employeesModal.value = false;
    selectedBranch.value = null;
    branchEmployees.value = [];
  };

  const formatAddress = (branch) => {
    const parts = [branch.city, branch.state, branch.country].filter(Boolean);
    return parts.join(', ') || 'Address not complete';
  };

  // Lifecycle
  onMounted(async () => {
    try {
      await loadBranches();
    } catch (error) {
      console.error('Failed to initialize component:', error);
    }
  });
</script>
<template>
  <div class="container mx-auto p-4">
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
    <div v-if="!isBoardDirector" class="flex justify-end mb-6">
      <button @click="openCreateModal" class="btn  btn-sm">
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
        <div class="stat-figure text-black/60">
          <Users class="w-8 h-8" />
        </div>
        <div class="stat-title">Employees</div>
        <div class="stat-value text-black/60">
          {{ branchStats.total_employees_in_branches }}
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
          class="btn btn-outline border-gray-300"
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
            :class="['table transition-colors duration-300', 'table-zebra']"
          >
            <thead>
              <tr>
                <th>Branch Info</th>
                <th>Location</th>
                <th>Status</th>
                <th v-if="!isBoardDirector">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="branch in filteredBranches" :key="branch.id">
                <td>
                  <div class="flex items-center gap-3">
                    <img
                      v-if="branch.image_url"
                      :src="branch.image_url"
                      alt="Branch"
                      class="w-12 h-12 rounded object-cover border"
                      @error="(e) => (e.target.style.display = 'none')"
                    />
                    <div>
                      <div class="font-bold">{{ branch.name }}</div>
                      <div
                        v-if="branch.description"
                        class="text-xs text-base-content/50 mt-1"
                      >
                        {{ branch.description }}
                      </div>
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
                  <div
                    :class="[
                      'badge',
                      statusBadgeClass(branch.is_active, branch.deleted_at),
                    ]"
                  >
                    <BadgeCheck
                      v-if="branch.is_active && !branch.deleted_at"
                      class="w-3 h-3 mr-1"
                    />
                    {{
                      branch.deleted_at
                        ? 'Deleted'
                        : branch.is_active
                          ? 'Active'
                          : 'Inactive'
                    }}
                  </div>
                </td>
                <td v-if="!isBoardDirector">
                  <div class="dropdown dropdown-left">
                    <EllipsisVertical
                      class="w-4 h-4 cursor-pointer"
                      tabindex="0"
                    />
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-44"
                    >
                      <li v-if="!branch.deleted_at">
                        <a @click="viewBranchEmployees(branch)">
                          <Eye class="w-3 h-3" /> View Employees
                        </a>
                      </li>
                      <li v-if="!branch.deleted_at">
                        <a @click="editBranch(branch)">
                          <Edit class="w-3 h-3" /> Edit Branch
                        </a>
                      </li>
                      <li v-if="!branch.deleted_at">
                        <a
                          @click="toggleBranchStatus(branch.id)"
                          :class="
                            branch.is_active ? 'text-warning' : 'text-success'
                          "
                        >
                          <CheckCircle class="w-3 h-3" />
                          {{ branch.is_active ? 'Deactivate' : 'Activate' }}
                        </a>
                      </li>
                      <li v-if="!branch.deleted_at">
                        <a @click="deleteBranch(branch)" class="text-error">
                          <Trash2 class="w-3 h-3" /> Delete Branch
                        </a>
                      </li>
                      <li v-if="branch.deleted_at">
                        <a @click="restoreBranch(branch)" class="text-success">
                          <UserCheck class="w-3 h-3" /> Restore Branch
                        </a>
                      </li>
                    </ul>
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
            v-if="!searchQuery && !isBoardDirector"
            @click="openCreateModal"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none"
          >
            <Plus class="w-4 h-4 mr-2" />
            Add First Branch
          </button>
        </div>
      </div>

      <!-- Toggle for showing deleted branches -->
      <div
        class="flex items-center gap-2 justify-end border-t border-black/10 p-4"
      >
        <input
          type="checkbox"
          v-model="showDeletedBranches"
          @change="toggleDeletedBranches"
          class="checkbox checkbox-sm checked:bg-primaryColor text-white checked:border-primaryColor"
          id="show-deleted"
        />
        <label for="show-deleted" class="text-sm font-medium text-gray-700">
          Show Deleted
        </label>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="branchModal" class="modal modal-open">
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
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- Address -->
            <div class="form-control col-span-2">
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

            <!-- Optional Image URL with preview or upload -->
            <div class="form-control col-span-2">
              <label class="label mb-1">
                <span class="label-text">Branch Image (optional)</span>
              </label>
              <div class="flex gap-2">
                <input
                  v-model="branchForm.image_url"
                  type="text"
                  placeholder="https://example.com/image.jpg or /uploads/branch-images/file.png"
                  class="input input-sm sm:input-md input-bordered w-full"
                />
                <input
                  type="file"
                  accept="image/*"
                  class="file-input file-input-sm file-input-bordered"
                  @change="onImageFileSelected"
                />
              </div>
              <div v-if="branchForm.image_url" class="mt-2">
                <img
                  :src="branchForm.image_url"
                  alt="Branch Image Preview"
                  class="w-full h-32 object-cover rounded-lg border"
                  @error="(e) => (e.target.style.display = 'none')"
                />
              </div>
            </div>
          </div>

          <!-- Location Details Section -->
          <div
            class="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
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

            <!-- Radius (meters) -->
            <div
              class="form-control w-full max-w-md mx-auto sm:max-w-sm md:max-w-md"
            >
              <label class="label mb-1">
                <span class="label-text text-sm sm:text-base"
                  >Allowed Radius (m)</span
                >
              </label>

              <input
                v-model.number="branchForm.radius_meters"
                type="number"
                min="1"
                step="0.5"
                placeholder="e.g., 2"
                class="input input-sm sm:input-md input-bordered w-full"
              />

              <span
                class="text-xs text-gray-500 mt-1 block text-center sm:text-left"
              >
                Used for attendance geofencing tolerance.
              </span>
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
                class="btn  btn-sm text-gray-600 hover:bg-gray-100 font-thin"
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
      <div class="modal-backdrop" @click="closeModal"></div>
    </div>

    <!-- Employees Modal -->
    <div v-if="employeesModal" class="modal modal-open">
      <div
        :class="[
          'modal-box w-11/12 max-w-2xl transition-colors duration-300',
          themeStore.themeClasses.modal,
        ]"
      >
        <h3 class="font-bold text-lg mb-4">
          Employees in {{ selectedBranch?.name }}
        </h3>

        <div v-if="branchEmployees.length > 0" class="space-y-2">
          <div
            v-for="employee in branchEmployees"
            :key="employee.id"
            class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
          >
            <div>
              <div class="font-medium">
                {{ employee.first_name }} {{ employee.last_name }}
              </div>
              <div class="text-sm text-base-content/70">
                {{ employee.email }}
              </div>
            </div>
            <div class="text-right">
              <div class="badge bg-primaryColor/10 text-primaryColor">
                {{ employee.role || 'No Role' }}
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <Users class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p class="text-base-content/70">
            No employees assigned to this branch
          </p>
        </div>

        <div class="modal-action">
          <button @click="closeEmployeesModal" class="btn">Close</button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeEmployeesModal"></div>
    </div>

    <!-- Google Maps Modal -->
    <div v-if="googleMapsModal" class="modal modal-open">
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
              @input="onSearchInput"
              @keyup.enter="handleSearchClick"
            />
            <div class="flex gap-2 justify-end items-center">
              <button
                @click="handleSearchClick"
                class="btn bg-gray-200 font-thin hover:bg-gray-300 text-gray-700 border-none"
              >
                <font-awesome-icon icon="fa-solid fa-search" />
                Search
              </button>
              <button
                @click="getCurrentLocation"
                class="btn bg-primaryColor !font-thin hover:bg-primaryColor/80 text-white border-none"
                title="Get your current location"
              >
                <font-awesome-icon icon="fa-solid fa-location-dot" />
                Current
              </button>
            </div>
          </div>

          <!-- Autocomplete dropdown -->
          <div
            v-if="showSuggestions && suggestions.length"
            class="mt-1 max-h-72 overflow-auto rounded-md border border-base-200 bg-base-100 shadow"
          >
            <ul>
              <li
                v-for="(s, idx) in suggestions"
                :key="idx"
                class="px-3 py-2 cursor-pointer hover:bg-base-200 text-sm border-b last:border-b-0"
                @click="selectSuggestion(s)"
              >
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'text-primaryColor',
                      (s.display_name || '')
                        .toLowerCase()
                        .includes('countryside') &&
                      (s.display_name || '')
                        .toLowerCase()
                        .includes('steakhouse')
                        ? 'text-red-500'
                        : 'text-primaryColor',
                    ]"
                  >
                    {{
                      (s.display_name || '')
                        .toLowerCase()
                        .includes('countryside') &&
                      (s.display_name || '')
                        .toLowerCase()
                        .includes('steakhouse')
                        ? '🥩'
                        : '📍'
                    }}
                  </span>
                  <div class="flex-1">
                    <div
                      :class="[
                        'font-medium',
                        (s.display_name || '')
                          .toLowerCase()
                          .includes('countryside') &&
                        (s.display_name || '')
                          .toLowerCase()
                          .includes('steakhouse')
                          ? 'text-red-600 font-bold'
                          : '',
                      ]"
                      v-html="highlightMatch(getSuggestionTitle(s))"
                    ></div>
                    <div class="text-xs opacity-70">
                      {{ getSuggestionSubtitle(s) }}
                    </div>
                  </div>
                </div>
              </li>
            </ul>
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
              <button
                @click="reloadCountrysideMarkers"
                class="btn btn-xs bg-red-500 text-white hover:bg-red-600 border border-red-600 shadow-md"
                title="Reload Countryside markers"
              >
                <font-awesome-icon icon="fa-solid fa-map-marker-alt" />
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

        <!-- Latitude and Longitude Input Fields -->
        <div class="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label class="label pb-2">
              <span
                :class="[
                  'label-text font-medium',
                  themeStore.themeClasses.textSecondary,
                ]"
                >Latitude</span
              >
            </label>
            <input
              v-model.number="manualLat"
              type="number"
              step="any"
              :class="[
                'input input-bordered w-full transition-colors duration-300',
                themeStore.themeClasses.input,
              ]"
              placeholder="e.g. 14.3297"
              @input="updateCoordinatesFromManual"
            />
            <p class="text-xs text-gray-500 mt-1">
              Auto-fills when you click the map
            </p>
          </div>
          <div>
            <label class="label pb-2">
              <span
                :class="[
                  'label-text font-medium',
                  themeStore.themeClasses.textSecondary,
                ]"
                >Longitude</span
              >
            </label>
            <input
              v-model.number="manualLng"
              type="number"
              step="any"
              :class="[
                'input input-bordered w-full transition-colors duration-300',
                themeStore.themeClasses.input,
              ]"
              placeholder="e.g. 120.9369"
              @input="updateCoordinatesFromManual"
            />
            <p class="text-xs text-gray-500 mt-1">
              Auto-fills when you click the map
            </p>
          </div>
        </div>

        <div class="modal-action">
          <button
            class="btn btn-outline font-thin btn-sm text-black/50 border-none hover:bg-gray-100"
            @click="closeGoogleMapsModal"
          >
            Cancel
          </button>
          <button
            class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/80 border-none !font-thin"
            @click="applySelectedAddress"
            :disabled="!selectedAddress.trim()"
          >
            <font-awesome-icon icon="fa-solid fa-check" /> Apply Address
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeGoogleMapsModal"></div>
    </div>

    <!-- Toast Notification -->
    <transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transform transition ease-in duration-300"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div class="toast toast-end z-[999999]" v-if="toast.show">
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
    <div v-if="confirmModal.show" class="modal modal-open">
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
            {{
              confirmModal.loading
                ? confirmModal.title.includes('Create')
                  ? 'Creating...'
                  : confirmModal.title.includes('Update')
                    ? 'Updating...'
                    : confirmModal.title.includes('Delete')
                      ? 'Deleting...'
                      : confirmModal.title.includes('Status')
                        ? 'Updating...'
                        : 'Processing...'
                : 'Confirm'
            }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="closeConfirm"></div>
    </div>
  </div>
</template>

<style scoped>
  /* Ensure toast appears above all modals */
  .toast {
    z-index: 999999 !important;
  }
</style>
