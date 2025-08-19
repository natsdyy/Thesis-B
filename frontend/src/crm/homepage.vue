<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-green-800 text-white shadow-lg sticky top-0 z-50">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo and Brand -->
          <div class="flex items-center space-x-4">
            <div class="w-16 h-16 flex items-center justify-center">
              <img src="/logo1.png" alt="Countryside Logo" class="w-full h-full object-contain" />
            </div>
            <h1 class="text-2xl font-bold">Countryside Steakhouse</h1>
          </div>
          
          <!-- Navigation -->
          <nav class="hidden md:flex items-center space-x-8">
            <a href="#home" class="hover:text-orange-300 transition-colors font-medium">Home</a>
            <a href="#about" class="hover:text-orange-300 transition-colors font-medium">About</a>
            <a href="#menu" class="hover:text-orange-300 transition-colors font-medium">Menu</a>
            <a href="#gallery" class="hover:text-orange-300 transition-colors font-medium">Gallery</a>
            <a href="#stores" class="hover:text-orange-300 transition-colors font-medium">Locations</a>
            <a href="#contact" class="hover:text-orange-300 transition-colors font-medium">Contact</a>
          </nav>
          
          <!-- Login Button -->
          <div class="flex items-center space-x-4">
            <button @click="goToLogin" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              Login
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section id="home" class="relative bg-cover bg-center h-screen flex items-center" style="background-image: url('/picture1.jpg');">
      <div class="relative z-10 container mx-auto px-6 text-center">
        <div class="max-w-4xl mx-auto">
          <h2 class="text-6xl md:text-7xl font-bold mb-6 text-white leading-tight">
            Welcome to <span class="text-orange-400">Countryside</span> Steakhouse
          </h2>
          <p class="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Experience the finest steaks and authentic Filipino cuisine in a rustic, welcoming atmosphere that feels like home.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button class="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto">
              View Our Menu
            </button>
            <button class="bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-800 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 w-full sm:w-auto">
              Find Locations
            </button>
          </div>
        </div>
      </div>
      
      <!-- Scroll Indicator -->
      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div class="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <div class="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section id="about" class="py-20 bg-white">
      <div class="container mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-4xl font-bold text-green-800 mb-6">Our Story Since 1984</h2>
            <p class="text-lg text-gray-600 mb-6 leading-relaxed">
              For over four decades, Countryside Steakhouse has been serving the finest quality steaks and authentic Filipino dishes. 
              What started as a small family restaurant has grown into a beloved institution, known for our warm hospitality and 
              commitment to culinary excellence.
            </p>
            <p class="text-lg text-gray-600 mb-8 leading-relaxed">
              Our rustic atmosphere and traditional recipes bring the authentic flavors of the countryside to your table, 
              creating memorable dining experiences for families and friends.
            </p>
            <div class="grid grid-cols-3 gap-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-500 mb-2">40+</div>
                <div class="text-gray-600">Years of Excellence</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-500 mb-2">3</div>
                <div class="text-gray-600">Locations</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-500 mb-2">1000+</div>
                <div class="text-gray-600">Happy Customers</div>
              </div>
            </div>
          </div>
          <div class="relative">
            <div class="bg-green-100 rounded-2xl p-8">
              <div class="text-center">
                <div class="w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <img src="/logo1.png" alt="Countryside Logo" class="w-full h-full object-contain" />
                </div>
                <h3 class="text-2xl font-bold text-green-800 mb-4">Why Choose Countryside?</h3>
                <ul class="text-left space-y-3 text-gray-700">
                  <li class="flex items-center">
                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Premium quality ingredients
                  </li>
                  <li class="flex items-center">
                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Authentic Filipino recipes
                  </li>
                  <li class="flex items-center">
                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Warm, family atmosphere
                  </li>
                  <li class="flex items-center">
                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                    Expert chefs with decades of experience
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Menu Highlights -->
    <section id="menu" class="py-20 bg-gray-50">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-green-800 mb-4">Signature Dishes</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover our most popular dishes, crafted with love and the finest ingredients
          </p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- T-Bone Steak -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div class="h-48 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <div class="text-center text-white">
                <div class="text-4xl mb-2">🥩</div>
                <div class="text-sm opacity-90">Premium Cut</div>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">T-Bone Steak</h3>
              <p class="text-gray-600 mb-4">Our signature cut, perfectly grilled to your preference</p>
              <div class="flex justify-between items-center">
                <span class="text-2xl font-bold text-orange-500">₱1,200</span>
                <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  Order Now
                </button>
              </div>
            </div>
          </div>

          <!-- Chicken Wings -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div class="h-48 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <div class="text-center text-white">
                <div class="text-4xl mb-2">🍗</div>
                <div class="text-sm opacity-90">Crispy & Juicy</div>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">Chicken Wings</h3>
              <p class="text-gray-600 mb-4">Crispy wings with our special seasoning blend</p>
              <div class="flex justify-between items-center">
                <span class="text-2xl font-bold text-orange-500">₱350</span>
                <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  Order Now
                </button>
              </div>
            </div>
          </div>

          <!-- Pork Steak -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div class="h-48 bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
              <div class="text-center text-white">
                <div class="text-4xl mb-2">🥓</div>
                <div class="text-sm opacity-90">Filipino Style</div>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">Pork Steak</h3>
              <p class="text-gray-600 mb-4">Tender pork with rich gravy and onions</p>
              <div class="flex justify-between items-center">
                <span class="text-2xl font-bold text-orange-500">₱280</span>
                <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  Order Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Promotions Section -->
    <section class="py-20 bg-green-800">
      <div class="container mx-auto px-6">
        <div class="grid md:grid-cols-2 gap-8">
          <!-- Sizzling Tuesday Card -->
          <div class="bg-orange-500 rounded-2xl p-8 text-white relative overflow-hidden hover:transform hover:scale-105 transition-all duration-300">
            <div class="text-center mb-6">
              <div class="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-sm font-bold text-white text-center leading-tight">COUNTRYSIDE<br>1984</span>
              </div>
              <h3 class="text-3xl font-bold mb-2">SIZZLING TUESDAY</h3>
              <p class="text-lg">Subukan ang Sizzling Sarap sa Countryside!</p>
              <p class="text-sm mt-2 opacity-90">Every Tuesday • 20% OFF on all sizzling plates</p>
            </div>
            <div class="flex justify-center space-x-4">
              <div class="w-20 h-20 bg-white bg-opacity-20 rounded-lg"></div>
              <div class="w-20 h-20 bg-white bg-opacity-20 rounded-lg"></div>
              <div class="w-20 h-20 bg-white bg-opacity-20 rounded-lg"></div>
            </div>
          </div>

          <!-- Cloud Card -->
          <div class="bg-green-600 rounded-2xl p-8 text-white relative overflow-hidden hover:transform hover:scale-105 transition-all duration-300">
            <div class="text-center">
              <h3 class="text-2xl font-bold mb-2">Sobrang sarap, parang nasa</h3>
              <div class="text-6xl font-bold mb-6 relative">
                ulap!
                <div class="absolute -top-4 -right-4 w-8 h-8 bg-white bg-opacity-20 rounded-full"></div>
                <div class="absolute -bottom-2 -left-2 w-6 h-6 bg-white bg-opacity-20 rounded-full"></div>
              </div>
              <div class="w-32 h-32 bg-white bg-opacity-20 rounded-full mx-auto mb-6"></div>
              <div class="flex justify-center space-x-6 text-sm">
                <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full">Grab Food</span>
                <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full">foodpanda</span>
                <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full">Facebook</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Our Stores Section -->
    <section id="stores" class="py-20 bg-white">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-green-800 mb-4">Visit Our Locations</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the Countryside difference at any of our three convenient locations
          </p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Burol Main Branch -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div class="h-48 bg-gradient-to-br from-green-400 to-green-600 relative">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-white">
                  <div class="text-4xl mb-2">🏢</div>
                  <div class="text-sm opacity-90">Main Branch</div>
                </div>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">Countryside Burol Main Branch</h3>
              <p class="text-gray-600 text-sm mb-3">COUNTRYSIDE STEAKHOUSE</p>
              <p class="text-gray-500 text-xs mb-4">T-BONE • CHICKEN WINGS • PORKSTEAK • TAPSILOG • SISIG</p>
              <div class="flex items-center text-sm text-gray-600 mb-3">
                <span class="mr-2">📍</span>
                <span>Burol, Main Street</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 mb-4">
                <span class="mr-2">🕒</span>
                <span>Open Daily 10AM-10PM</span>
              </div>
              <button class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                Get Directions
              </button>
            </div>
          </div>

          <!-- Malihan Main Branch -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div class="h-48 bg-gradient-to-br from-blue-400 to-blue-600 relative">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-white">
                  <div class="text-4xl mb-2">🏪</div>
                  <div class="text-sm opacity-90">P&N Branch</div>
                </div>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">Countryside Malihan Main Branch</h3>
              <p class="text-gray-600 text-sm mb-3">P&N COUNTRYSIDE STEAKHOUSE</p>
              <div class="flex items-center text-sm text-gray-600 mb-3">
                <span class="mr-2">📍</span>
                <span>Malihan, Central District</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 mb-4">
                <span class="mr-2">🕒</span>
                <span>Open Daily 10AM-10PM</span>
              </div>
              <button class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                Get Directions
              </button>
            </div>
          </div>

          <!-- Imus Branch -->
          <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div class="h-48 bg-gradient-to-br from-purple-400 to-purple-600 relative">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-white">
                  <div class="text-4xl mb-2">🏘️</div>
                  <div class="text-sm opacity-90">Imus Branch</div>
                </div>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">Countryside Imus Branch</h3>
              <p class="text-gray-600 text-sm mb-3">COUNTRYSIDE STEAKHOUSE</p>
              <div class="flex items-center text-sm text-gray-600 mb-3">
                <span class="mr-2">📍</span>
                <span>Imus, Business District</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 mb-4">
                <span class="mr-2">🕒</span>
                <span>Open Daily 10AM-10PM</span>
              </div>
              <button class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                Get Directions
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 bg-gray-50">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-green-800 mb-4">Get In Touch</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions or want to make a reservation? We'd love to hear from you!
          </p>
        </div>
        
        <div class="grid lg:grid-cols-2 gap-12">
          <div>
            <h3 class="text-2xl font-bold text-green-800 mb-6">Contact Information</h3>
            <div class="space-y-4">
              <div class="flex items-center">
                <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                  <span class="text-white text-xl">📞</span>
                </div>
                <div>
                  <div class="font-semibold text-gray-800">Phone</div>
                  <div class="text-gray-600">+63 912 345 6789</div>
                </div>
              </div>
              <div class="flex items-center">
                <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                  <span class="text-white text-xl">📧</span>
                </div>
                <div>
                  <div class="font-semibold text-gray-800">Email</div>
                  <div class="text-gray-600">info@countrysidesteakhouse.com</div>
                </div>
              </div>
              <div class="flex items-center">
                <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                  <span class="text-white text-xl">📍</span>
                </div>
                <div>
                  <div class="font-semibold text-gray-800">Main Office</div>
                  <div class="text-gray-600">Burol Main Street, Countryside City</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-white rounded-2xl p-8 shadow-lg">
            <h3 class="text-2xl font-bold text-green-800 mb-6">Send us a Message</h3>
            <form class="space-y-4">
              <div>
                <input type="text" placeholder="Your Name" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
              </div>
              <div>
                <input type="email" placeholder="Your Email" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
              </div>
              <div>
                <textarea rows="4" placeholder="Your Message" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"></textarea>
              </div>
              <button type="submit" class="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-green-800 text-white py-12">
      <div class="container mx-auto px-6">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-12 h-12 flex items-center justify-center">
                <img src="/logo1.png" alt="Countryside Logo" class="w-full h-full object-contain" />
              </div>
              <h3 class="text-xl font-bold">Countryside Steakhouse</h3>
            </div>
            <p class="text-gray-300 text-sm leading-relaxed">
              Serving the finest steaks and authentic Filipino cuisine since 1984. 
              Experience the warmth of countryside hospitality.
            </p>
          </div>
          
          <div>
            <h4 class="text-lg font-semibold mb-4">Quick Links</h4>
            <ul class="space-y-2 text-gray-300">
              <li><a href="#home" class="hover:text-orange-300 transition-colors">Home</a></li>
              <li><a href="#about" class="hover:text-orange-300 transition-colors">About Us</a></li>
              <li><a href="#menu" class="hover:text-orange-300 transition-colors">Menu</a></li>
              <li><a href="#stores" class="hover:text-orange-300 transition-colors">Locations</a></li>
            </ul>
          </div>
          
          <div>
            <h4 class="text-lg font-semibold mb-4">Services</h4>
            <ul class="space-y-2 text-gray-300">
              <li>Dine-in</li>
              <li>Take-out</li>
              <li>Delivery</li>
              <li>Catering</li>
            </ul>
          </div>
          
          <div>
            <h4 class="text-lg font-semibold mb-4">Connect With Us</h4>
            <div class="flex space-x-4 mb-4">
              <a href="#" class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors">
                <span class="text-white">📘</span>
              </a>
              <a href="#" class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors">
                <span class="text-white">📷</span>
              </a>
              <a href="#" class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors">
                <span class="text-white">🐦</span>
              </a>
            </div>
            <p class="text-sm text-gray-300">Follow us for updates and special offers!</p>
          </div>
        </div>
        
        <div class="border-t border-green-700 pt-8">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <div class="flex space-x-6 mb-4 md:mb-0">
              <a href="#" class="hover:text-orange-300 transition-colors">Privacy Policy</a>
              <a href="#" class="hover:text-orange-300 transition-colors">Terms of Service</a>
              <a href="#" class="hover:text-orange-300 transition-colors">Contact Us</a>
            </div>
            <div class="text-center md:text-right">
              <p class="text-sm">© 2025 COUNTRYSIDE STEAKHOUSE. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #365a40;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #2d4a35;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Hover effects */
.hover\:text-orange-300:hover {
  color: #fbbf24;
}

.hover\:bg-orange-600:hover {
  background-color: #ea580c;
}

.hover\:bg-white:hover {
  background-color: #ffffff;
}

.hover\:text-gray-800:hover {
  color: #1f2937;
}

/* Animation classes */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}
</style>
