const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class MenuService {
  // Get all available menu items for public display
  async getPublicMenuItems(filters = {}) {
    try {
      const params = new URLSearchParams();

      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ''
        ) {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/api/menu/public/items?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch menu items');
      }

      return data;
    } catch (error) {
      console.error('Error fetching public menu items:', error);
      throw error;
    }
  }

  // Get menu items by category
  async getMenuItemsByCategory(category, limit = 12) {
    try {
      return await this.getPublicMenuItems({ category, limit });
    } catch (error) {
      console.error('Error fetching menu items by category:', error);
      throw error;
    }
  }

  // Get featured menu items (signature dishes)
  async getFeaturedMenuItems(limit = 4) {
    try {
      const result = await this.getPublicMenuItems({ limit });
      return result;
    } catch (error) {
      console.error('Error fetching featured menu items:', error);
      throw error;
    }
  }

  // Get all menu categories
  async getMenuCategories() {
    try {
      // This would typically come from a separate endpoint
      // For now, return common categories
      return [
        'All',
        'Sizzling Plates',
        'Steaks',
        'Breakfast',
        'Sides',
        'Beverages',
      ];
    } catch (error) {
      console.error('Error fetching menu categories:', error);
      throw error;
    }
  }
}

export default new MenuService();
