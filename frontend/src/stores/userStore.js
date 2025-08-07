import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const userCount = computed(() => users.value.length)
  const hasUsers = computed(() => users.value.length > 0)
  const deletedUsers = computed(() => users.value.filter(user => user.deleted_at))

  // Actions
  const fetchUsers = async (includeDeleted = false) => {
    loading.value = true
    error.value = null
    
    try {
      const url = `http://localhost:5000/api/users${includeDeleted ? '?includeDeleted=true' : ''}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        users.value = data.data
      } else {
        throw new Error(data.message || 'Failed to fetch users')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching users:', err)
    } finally {
      loading.value = false
    }
  }

  const createUser = async (userData) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        users.value.push(data.data)
        users.value.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return data.data
      } else {
        throw new Error(data.message || 'Failed to create user')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error creating user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (id, userData) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        const index = users.value.findIndex(user => user.id === id)
        if (index !== -1) {
          users.value[index] = data.data
        }
        return data.data
      } else {
        throw new Error(data.message || 'Failed to update user')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error updating user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteUser = async (id) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        users.value = users.value.filter(user => user.id !== id)
        return true
      } else {
        throw new Error(data.message || 'Failed to delete user')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error deleting user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const restoreUser = async (id) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}/restore`, {
        method: 'PATCH',
      })
      
      const data = await response.json()
      
      if (data.success) {
        const index = users.value.findIndex(user => user.id === id)
        if (index !== -1) {
          users.value[index] = data.data
        }else{
          users.value.push(data.data)
        }
        users.value.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return true
      } else {
        throw new Error(data.message || 'Failed to restore user')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error restoring user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    users,
    loading,
    error,
    
    // Getters
    userCount,
    hasUsers,
    deletedUsers,
    
    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    clearError
  }
})