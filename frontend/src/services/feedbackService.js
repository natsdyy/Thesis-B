import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

class FeedbackService {
  /**
   * Submit customer feedback
   * @param {FormData|Object} feedbackData - The feedback data (FormData for image uploads, Object for text-only)
   * @param {string} feedbackData.name - Customer's name
   * @param {string} feedbackData.email - Customer's email
   * @param {string} feedbackData.message - Feedback message
   * @param {string} [feedbackData.phone] - Customer's phone number (optional)
   * @param {number} [feedbackData.rating] - Rating from 1-5 (optional)
   * @param {File} [feedbackData.image] - Optional image file
   * @returns {Promise<Object>} API response
   */
  async submitFeedback(feedbackData) {
    try {
      let config = {};

      // If feedbackData is FormData (has image), don't set Content-Type header
      // If it's a regular object, set JSON content type
      if (!(feedbackData instanceof FormData)) {
        config.headers = {
          'Content-Type': 'application/json',
        };
      }

      const response = await axios.post(
        `${API_BASE_URL}/feedback`,
        feedbackData,
        config
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Check feedback service health
   * @returns {Promise<Object>} Health check response
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${API_BASE_URL}/feedback/health`);
      return response.data;
    } catch (error) {
      console.error('Error checking feedback service health:', error);
      throw error;
    }
  }
}

export default new FeedbackService();
