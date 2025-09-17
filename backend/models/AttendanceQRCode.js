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

  static async generateQRCode(locationName, description = '') {
    const qrCode = `ATTENDANCE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const data = {
      qr_code: qrCode,
      location_name: locationName,
      description: description,
      is_active: true
    };

    return await this.create(data);
  }
}

module.exports = AttendanceQRCode;
