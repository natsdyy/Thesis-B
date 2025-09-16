const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/rbac');

// Helper to parse JSON safely
function safeParseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (_e) {
    return fallback;
  }
}

// Get all branch schedules (branch-only; employee optional)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await db('branch_schedules as bs')
      .select(
        'bs.id',
        'bs.branch_id',
        'bs.day_of_week',
        'bs.start_time',
        'bs.end_time',
        'bs.is_active',
        'bs.created_at',
        'bs.updated_at',
        'b.name as branch_name'
      )
      .leftJoin('branches as b', 'bs.branch_id', 'b.id')
      .orderBy([{ column: 'b.name', order: 'asc' }, { column: 'bs.created_at', order: 'desc' }]);

    const data = rows.map((r) => ({
      id: r.id,
      branch_id: r.branch_id,
      branch_name: r.branch_name,
      employee_id: null,
      employee_name: null,
      schedule_type: 'custom', // derived from day_of_week
      schedule_date: null,
      selected_days: r.day_of_week ? r.day_of_week.split(',') : [],
      shift_start: r.start_time,
      shift_end: r.end_time,
      status: r.is_active ? 'active' : 'cancelled',
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch branch schedules', error: error.message });
  }
});

// Summary per branch
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const rows = await db('branch_schedules as bs')
      .select(
        'b.id as branch_id',
        'b.name as branch_name',
        'bs.day_of_week',
        'bs.start_time',
        'bs.end_time'
      )
      .leftJoin('branches as b', 'bs.branch_id', 'b.id');

    const summaryByBranch = {};

    for (const r of rows) {
      if (!summaryByBranch[r.branch_id]) {
        summaryByBranch[r.branch_id] = {
          branch_id: r.branch_id,
          branch_name: r.branch_name,
          total: 0,
          byType: { specific: 0, weekdays: 0, weekends: 0, custom: 0 },
        };
      }
      const s = summaryByBranch[r.branch_id];
      s.total += 1;
      const type = 'custom'; // all schedules are custom since we use day_of_week
      if (!s.byType[type]) s.byType[type] = 0;
      s.byType[type] += 1;
    }

    res.json({ success: true, data: Object.values(summaryByBranch) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to build summary', error: error.message });
  }
});

// Create branch schedule (employee optional)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      branch_id,
      employee_id = null,
      schedule_type = 'specific',
      schedule_date,
      selected_days,
      shift_start,
      shift_end,
      status = 'active',
    } = req.body;

    if (!branch_id || !shift_start || !shift_end) {
      return res.status(400).json({ success: false, message: 'Branch, shift_start and shift_end are required' });
    }

    if (schedule_type === 'specific' && !schedule_date) {
      return res.status(400).json({ success: false, message: 'schedule_date is required for specific schedules' });
    }

    if (schedule_type !== 'specific' && (!selected_days || (Array.isArray(selected_days) && selected_days.length === 0))) {
      return res.status(400).json({ success: false, message: 'selected_days required for recurring schedules' });
    }

    // Derive day_of_week string to satisfy NOT NULL constraint
    let dayOfWeek = null;
    if (schedule_type === 'specific' && schedule_date) {
      try {
        const d = new Date(schedule_date);
        const names = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        if (!isNaN(d.getTime())) dayOfWeek = names[d.getUTCDay()];
      } catch (_e) { /* ignore */ }
    } else if (Array.isArray(selected_days) && selected_days.length > 0) {
      dayOfWeek = selected_days.join(',');
    }
    if (!dayOfWeek) {
      // fallback so DB not-null passes
      dayOfWeek = 'unspecified';
    }

    const insert = {
      branch_id,
      day_of_week: dayOfWeek,
      start_time: shift_start,
      end_time: shift_end,
      is_active: (status || 'active') === 'active',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    console.log('[branch-schedules:create] insert payload =>', insert);

    const [created] = await db('branch_schedules').insert(insert).returning('*');

    created.selected_days = safeParseJson(created.selected_days, created.selected_days) || [];

    res.status(201).json({ success: true, data: created, message: 'Branch schedule created successfully' });
  } catch (error) {
    console.error('[branch-schedules:create] Error:', error && (error.stack || error));
    res.status(500).json({
      success: false,
      message: 'Failed to create branch schedule',
      error: error.message,
      detail: error.detail || undefined,
      code: error.code || undefined
    });
  }
});

// Update branch schedule
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      branch_id,
      employee_id = null,
      schedule_type,
      schedule_date,
      selected_days,
      shift_start,
      shift_end,
      status,
    } = req.body;

    const update = { updated_at: db.fn.now() };
    if (branch_id !== undefined) update.branch_id = branch_id;
    if (shift_start) update.start_time = shift_start;
    if (shift_end) update.end_time = shift_end;
    if (status) update.is_active = (status === 'active');
    
    // Update day_of_week if selected_days provided
    if (selected_days && Array.isArray(selected_days) && selected_days.length > 0) {
      update.day_of_week = selected_days.join(',');
    }

    const [updated] = await db('branch_schedules').where('id', id).update(update).returning('*');
    if (!updated) return res.status(404).json({ success: false, message: 'Branch schedule not found' });

    // Map back to expected format
    const mappedUpdated = {
      ...updated,
      schedule_type: 'custom',
      selected_days: updated.day_of_week ? updated.day_of_week.split(',') : [],
      shift_start: updated.start_time,
      shift_end: updated.end_time,
      status: updated.is_active ? 'active' : 'cancelled'
    };
    res.json({ success: true, data: mappedUpdated, message: 'Branch schedule updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update branch schedule', error: error.message });
  }
});

// Delete
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await db('branch_schedules').where('id', req.params.id).del();
    if (!deleted) return res.status(404).json({ success: false, message: 'Branch schedule not found' });
    res.json({ success: true, message: 'Branch schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete branch schedule', error: error.message });
  }
});

module.exports = router;
