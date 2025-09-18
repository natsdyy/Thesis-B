const { db: knex } = require('../config/database');

class AttendanceQRCode {
  static async create(data) {
    const [qrCode] = await knex('attendance_qr_codes')
      .insert(data)
      .returning('*');
    return qrCode;
  }

  static async findAll() {
    return await knex('attendance_qr_codes')
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  static async findById(id) {
    const [qrCode] = await knex('attendance_qr_codes')
      .where('id', id)
      .andWhere('is_active', true);
    return qrCode;
  }

  static async findByQRCode(qrCode) {
    const [record] = await knex('attendance_qr_codes')
      .where('qr_code', qrCode)
      .andWhere('is_active', true);
    return record;
  }

  static async update(id, data) {
    const [updated] = await knex('attendance_qr_codes')
      .where('id', id)
      .update({ ...data, updated_at: knex.fn.now() })
      .returning('*');
    return updated;
  }

  static async delete(id) {
    return await knex('attendance_qr_codes')
      .where('id', id)
      .update({ is_active: false, updated_at: knex.fn.now() });
  }

  static async generateQRCode(locationName, description = '', latitude = null, longitude = null, branchId = null, radiusMeters = 2.0) {
    const qrCode = `ATTENDANCE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const data = {
      qr_code: qrCode,
      location_name: locationName,
      description: description,
      latitude: latitude,
      longitude: longitude,
      branch_id: branchId,
      radius_meters: radiusMeters,
      is_active: true
    };

    return await this.create(data);
  }

  static async findByBranchId(branchId) {
    return await knex('attendance_qr_codes')
      .where('branch_id', branchId)
      .andWhere('is_active', true)
      .orderBy('created_at', 'desc');
  }

  static async findNearby(latitude, longitude, radiusMeters = 100) {
    // This is a simplified version - in production, you might want to use PostGIS or similar
    // for more efficient spatial queries
    const allQRCodes = await knex('attendance_qr_codes')
      .where('is_active', true)
      .andWhereNotNull('latitude')
      .andWhereNotNull('longitude');

    const { calculateDistance } = require('../utils/locationUtils');
    
    return allQRCodes.filter(qrCode => {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        parseFloat(qrCode.latitude), 
        parseFloat(qrCode.longitude)
      );
      return distance <= radiusMeters;
    });
  }
}

module.exports = AttendanceQRCode;
