import { defineStore } from 'pinia';
import { apiConfig } from '../config/api';

export const useOvertimeStore = defineStore('overtime', {
  state: () => ({
    myRequests: [],
    requests: [],
    loading: false,
    error: null,
  }),
  actions: {
    // Format date to YYYY-MM-DD in Asia/Manila regardless of browser TZ
    ymdPH(value) {
      if (!value) return '';
      try {
        const str = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const d = new Date(str);
        if (isNaN(d)) return this.ymdLocal(str);
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        // en-CA yields YYYY-MM-DD
        return fmt.format(d);
      } catch (_) {
        return this.ymdLocal(String(value));
      }
    },
    ymdLocal(value) {
      if (!value) return '';
      try {
        const plain = String(value);
        const m = plain.match(/\d{4}-\d{2}-\d{2}$/);
        if (m) return m[0];
        const d = new Date(plain);
        if (isNaN(d)) return plain;
        return d.toLocaleDateString('en-CA');
      } catch (_) {
        return String(value);
      }
    },
    authHeaders() {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    async fetchMyRequests(page = 1, limit = 50) {
      try {
        this.loading = true;
        const res = await fetch(
          `${apiConfig.baseURL}/overtime/mine?page=${page}&limit=${limit}`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...this.authHeaders(),
            },
          }
        );
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        this.myRequests = rows.map((r) => {
          const datePart = this.ymdPH(r.ot_date || '');
          // Construct proper datetime strings with timezone info
          const startAt = `${datePart}T${r.start_time}+08:00`;
          // If end_time is <= start_time, treat as next day for display
          let endAt = `${datePart}T${r.end_time}+08:00`;
          try {
            const s = new Date(startAt);
            const e = new Date(endAt);
            if (!isNaN(s) && !isNaN(e) && e <= s) {
              e.setDate(e.getDate() + 1);
              endAt = e.toISOString();
            }
          } catch (_) {}
          return {
            id: r.id,
            date: datePart,
            start_at: startAt,
            end_at: endAt,
            total_hours: Number(r.total_hours || 0),
            reason: r.reason || '',
            status: r.status || 'pending',
          };
        });
      } catch (e) {
        this.error = e?.message || 'Failed to fetch my overtime requests';
        this.myRequests = [];
      } finally {
        this.loading = false;
      }
    },
    async submitRequest({
      ot_date,
      start_time,
      end_time,
      total_hours,
      reason,
    }) {
      const res = await fetch(`${apiConfig.baseURL}/overtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({
          ot_date: this.ymdPH(ot_date),
          start_time,
          end_time,
          total_hours,
          reason,
        }),
      });
      if (!res.ok) {
        let message = 'Failed to submit overtime request';
        try {
          const json = await res.json();
          if (json?.message) message = json.message;
        } catch (_) {}
        throw new Error(message);
      }
      await this.fetchMyRequests();
    },
    async fetchRequests({
      status,
      branch_id,
      department_only,
      department_id,
      exclude_employee_id,
      hr_only,
      page = 1,
      limit = 100,
    } = {}) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set('status', status);
      if (branch_id) params.set('branch_id', String(branch_id));
      if (department_only)
        params.set('department_only', String(department_only));
      if (department_id) params.set('department_id', String(department_id));
      // If department_id is a string department name, pass as department filter
      if (typeof department_id === 'string' && department_id) {
        params.delete('department_id');
        params.set('department', department_id);
      }
      if (exclude_employee_id)
        params.set('exclude_employee_id', String(exclude_employee_id));
      if (hr_only) params.set('hr_only', String(hr_only));
      const res = await fetch(
        `${apiConfig.baseURL}/overtime?${params.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.authHeaders(),
          },
        }
      );
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      this.requests = rows.map((r) => {
        const datePart = this.ymdPH(r.ot_date || '');
        const approverName =
          r.approver_first_name || r.approver_last_name
            ? `${r.approver_first_name || ''} ${r.approver_last_name || ''}`.trim()
            : null;
        return {
          id: r.id,
          employee_id: r.employee_id,
          first_name: r.first_name || '',
          last_name: r.last_name || '',
          employee_name:
            `${r.first_name || ''} ${r.last_name || ''}`.trim() ||
            r.employee_code ||
            `#${r.employee_id}`,
          employee_role: r.role || '',
          department: r.department || null,
          date: datePart,
          start_time: r.start_time,
          end_time: r.end_time,
          total_hours: Number(r.total_hours || 0),
          reason: r.reason || '',
          status: r.status || 'pending',
          submitted_at: r.created_at,
          approved_by: approverName || r.approved_by || null,
          approver_name: approverName,
          approved_at: r.approved_at || null,
          notes: r.approver_notes || '',
        };
      });
    },
    async approve(id, notes = '') {
      await fetch(`${apiConfig.baseURL}/overtime/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ notes }),
      });
    },
    async reject(id, notes = '') {
      await fetch(`${apiConfig.baseURL}/overtime/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ notes }),
      });
    },
  },
});
