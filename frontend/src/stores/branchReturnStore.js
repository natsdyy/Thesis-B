import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useBranchReturnStore = defineStore('branchReturn', () => {
  const returns = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchReturns = async (params = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      const { data } = await axios.get(
        `${apiConfig.baseURL}/branch-returns?${query.toString()}`
      );
      if (data.success) {
        returns.value = data.data || data.data?.data || data?.data || [];
        return data;
      }
      throw new Error(data.message || 'Failed to fetch branch returns');
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch branch returns';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createReturn = async ({ branch_id, return_type, items, notes }) => {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await axios.post(`${apiConfig.baseURL}/branch-returns`, {
        branch_id,
        return_type,
        items,
        notes,
      });
      if (data.success) {
        // Refresh list of pending returns
        await fetchReturns({ status: 'Pending' });
        return data.data;
      }
      throw new Error(data.message || 'Failed to create branch return');
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create branch return';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const approveReturn = async (id) => {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await axios.post(
        `${apiConfig.baseURL}/branch-returns/${id}/approve`
      );
      if (data.success) {
        await fetchReturns({ status: 'Pending' });
        return data.data;
      }
      throw new Error(data.message || 'Failed to approve return');
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to approve return';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const rejectReturn = async (id, reason = null) => {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await axios.post(
        `${apiConfig.baseURL}/branch-returns/${id}/reject`,
        { reason }
      );
      if (data.success) {
        await fetchReturns({ status: 'Pending' });
        return data.data;
      }
      throw new Error(data.message || 'Failed to reject return');
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to reject return';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const acknowledgeReturn = async (id, notes = null) => {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await axios.post(
        `${apiConfig.baseURL}/branch-returns/${id}/acknowledge`,
        { notes }
      );
      if (data.success) {
        await fetchReturns({ status: 'Approved' });
        return data.data;
      }
      throw new Error(data.message || 'Failed to acknowledge return');
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to acknowledge return';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    returns,
    loading,
    error,
    fetchReturns,
    createReturn,
    approveReturn,
    rejectReturn,
    acknowledgeReturn,
  };
});
