const API_BASE_URL = process.env.VUE_APP_API_URL || '';

class CustomerService {
  // Get all customers with filters
  async getCustomers(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/customers?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch customers');
      }

      return data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  // Get customer by ID
  async getCustomerById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch customer');
      }

      return data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  // Get customer with feedback and ratings
  async getCustomerDetails(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}/details`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch customer details');
      }

      return data;
    } catch (error) {
      console.error('Error fetching customer details:', error);
      throw error;
    }
  }

  // Create new customer
  async createCustomer(customerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create customer');
      }

      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  // Update customer
  async updateCustomer(id, customerData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update customer');
      }

      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  // Delete customer
  async deleteCustomer(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete customer');
      }

      return data;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Get customer statistics
  async getCustomerStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/stats`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch customer statistics');
      }

      return data;
    } catch (error) {
      console.error('Error fetching customer statistics:', error);
      throw error;
    }
  }

  // Get top customers by spending
  async getTopCustomers(limit = 10) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/top?limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch top customers');
      }

      return data;
    } catch (error) {
      console.error('Error fetching top customers:', error);
      throw error;
    }
  }

  // Get customers by location
  async getCustomersByLocation(city = null, province = null) {
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (province) params.append('province', province);

      const response = await fetch(`${API_BASE_URL}/api/customers/location?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch customers by location');
      }

      return data;
    } catch (error) {
      console.error('Error fetching customers by location:', error);
      throw error;
    }
  }

  // Update customer statistics
  async updateCustomerStats(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${id}/update-stats`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update customer statistics');
      }

      return data;
    } catch (error) {
      console.error('Error updating customer statistics:', error);
      throw error;
    }
  }

  // Find or create customer (used by feedback system)
  async findOrCreateCustomer(customerData) {
    try {
      // First try to find existing customer by email
      const existingCustomers = await this.getCustomers({ 
        search: customerData.email,
        limit: 1 
      });

      if (existingCustomers.data && existingCustomers.data.length > 0) {
        const existingCustomer = existingCustomers.data[0];
        if (existingCustomer.email === customerData.email) {
          return existingCustomer;
        }
      }

      // If not found, create new customer
      return await this.createCustomer(customerData);
    } catch (error) {
      console.error('Error finding or creating customer:', error);
      throw error;
    }
  }
}

export default new CustomerService();
