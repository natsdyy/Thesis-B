const { db } = require("../config/database");
const crypto = require("crypto");

class OTP {
  /**
   * Generate a 6-digit OTP code
   * @returns {string} 6-digit OTP code
   */
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a new OTP record
   * @param {string} email - User's email address
   * @param {string} otpCode - 6-digit OTP code
   * @param {number} expiryMinutes - Expiry time in minutes (default: 10)
   * @returns {Promise<Object>} Created OTP record
   */
  static async create(email, otpCode = null, expiryMinutes = 10) {
    try {
      const code = otpCode || this.generateOTP();
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // First, invalidate any existing OTPs for this email
      await this.invalidateExistingOTPs(email);

      const [otpRecord] = await db('otp_codes')
        .insert({
          email: email.toLowerCase().trim(),
          otp_code: code,
          expires_at: expiresAt,
          is_used: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');

      return {
        success: true,
        data: otpRecord
      };
    } catch (error) {
      console.error('Error creating OTP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify OTP code
   * @param {string} email - User's email address
   * @param {string} otpCode - 6-digit OTP code
   * @returns {Promise<Object>} Verification result
   */
  static async verify(email, otpCode) {
    try {
      const otpRecord = await db('otp_codes')
        .where({
          email: email.toLowerCase().trim(),
          otp_code: otpCode,
          is_used: false
        })
        .where('expires_at', '>', new Date())
        .first();

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or expired OTP code',
          code: 'INVALID_OTP'
        };
      }

      // Mark OTP as used
      await db('otp_codes')
        .where('id', otpRecord.id)
        .update({
          is_used: true,
          used_at: new Date(),
          updated_at: new Date()
        });

      return {
        success: true,
        message: 'OTP verified successfully',
        code: 'OTP_VERIFIED',
        data: otpRecord
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if there's a valid unused OTP for email
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Check result
   */
  static async hasValidOTP(email) {
    try {
      const otpRecord = await db('otp_codes')
        .where({
          email: email.toLowerCase().trim(),
          is_used: false
        })
        .where('expires_at', '>', new Date())
        .first();

      return {
        success: true,
        hasValidOTP: !!otpRecord,
        data: otpRecord
      };
    } catch (error) {
      console.error('Error checking valid OTP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Invalidate all existing OTPs for an email
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Invalidation result
   */
  static async invalidateExistingOTPs(email) {
    try {
      await db('otp_codes')
        .where({
          email: email.toLowerCase().trim(),
          is_used: false
        })
        .update({
          is_used: true,
          updated_at: new Date()
        });

      return {
        success: true,
        message: 'Existing OTPs invalidated'
      };
    } catch (error) {
      console.error('Error invalidating existing OTPs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   * @returns {Promise<Object>} Cleanup result
   */
  static async cleanupExpiredOTPs() {
    try {
      const deletedCount = await db('otp_codes')
        .where('expires_at', '<', new Date())
        .del();

      return {
        success: true,
        message: `Cleaned up ${deletedCount} expired OTPs`,
        deletedCount
      };
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get OTP statistics for monitoring
   * @returns {Promise<Object>} Statistics
   */
  static async getStats() {
    try {
      const stats = await db('otp_codes')
        .select(
          db.raw('COUNT(*) as total_otps'),
          db.raw('COUNT(CASE WHEN is_used = true THEN 1 END) as used_otps'),
          db.raw('COUNT(CASE WHEN is_used = false AND expires_at > NOW() THEN 1 END) as active_otps'),
          db.raw('COUNT(CASE WHEN is_used = false AND expires_at <= NOW() THEN 1 END) as expired_otps')
        )
        .first();

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting OTP stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = OTP;
