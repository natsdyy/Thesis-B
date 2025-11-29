const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class BranchService {
  // Upload branch image file
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${API_BASE_URL}/api/branches/upload-image`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to upload image');
    }
    return data.url; // relative URL
  }
  // Get all active branches for public display
  async getPublicBranches() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches/public`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch branches');
      }

      return data;
    } catch (error) {
      console.error('Error fetching public branches:', error);
      throw error;
    }
  }

  // Get branch by ID
  async getBranchById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch branch');
      }

      return data;
    } catch (error) {
      console.error('Error fetching branch:', error);
      throw error;
    }
  }

  // Get branch coordinates for location services
  async getBranchCoordinates(id) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/branches/${id}/coordinates`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch branch coordinates');
      }

      return data;
    } catch (error) {
      console.error('Error fetching branch coordinates:', error);
      throw error;
    }
  }
}

export default new BranchService();
