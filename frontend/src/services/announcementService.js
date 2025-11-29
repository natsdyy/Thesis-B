import { apiConfig } from '../config/api.js';

class AnnouncementService {
  // Get active announcements for public display
  async getActiveAnnouncements() {
    try {
      const apiUrl = apiConfig.baseURL || import.meta.env.VITE_API_URL || '';
      const url = `${apiUrl}/announcements/public/active`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // If endpoint doesn't exist yet, return empty array
        if (response.status === 404) {
          console.log('Announcements endpoint not found, returning empty array');
          return { success: true, data: [] };
        }
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch announcements';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Fetched announcements:', data);
      return data;
    } catch (error) {
      console.error('Error fetching announcements:', error);
      // Return empty array on error to prevent breaking the app
      return { success: true, data: [] };
    }
  }

  // Get all announcements (for admin use)
  async getAllAnnouncements() {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = apiConfig.baseURL || import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to fetch announcements';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching all announcements:', error);
      throw error;
    }
  }
}

export default new AnnouncementService();

