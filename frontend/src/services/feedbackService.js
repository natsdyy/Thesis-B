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
   * Send reply to customer feedback
   * @param {number} feedbackId - The feedback ID to reply to
   * @param {string} message - Reply message to send to customer
   * @param {string} [internalNote] - Optional internal note (not visible to customer)
   * @returns {Promise<Object>} API response
   */
  async sendReply(feedbackId, message, internalNote = '') {
    try {
      console.log('Sending reply to feedback ID:', feedbackId);
      console.log('Reply message:', message);
      console.log('API URL:', `${API_BASE_URL}/feedback/${feedbackId}/reply`);
      
      const response = await axios.post(
        `${API_BASE_URL}/feedback/${feedbackId}/reply`,
        {
          message,
          internal_note: internalNote
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000 // 15 second timeout (reduced from 30s)
        }
      );
      
      console.log('Reply sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending feedback reply:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Mark feedback as read
   * @param {number} feedbackId - The feedback ID to mark as read
   * @returns {Promise<Object>} API response
   */
  async markAsRead(feedbackId) {
    try {
      const response = await axios.patch(`${API_BASE_URL}/feedback/${feedbackId}/mark-read`);
      return response.data;
    } catch (error) {
      console.error('Error marking feedback as read:', error);
      throw error;
    }
  }

  /**
   * Archive feedback
   * @param {number} feedbackId - The feedback ID to archive
   * @returns {Promise<Object>} API response
   */
  async archiveFeedback(feedbackId) {
    try {
      const response = await axios.patch(`${API_BASE_URL}/feedback/${feedbackId}/archive`);
      return response.data;
    } catch (error) {
      console.error('Error archiving feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} API response
   */
  async getFeedback(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`${API_BASE_URL}/feedback?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching feedback:', error);
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
