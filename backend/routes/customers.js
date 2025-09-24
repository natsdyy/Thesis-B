const express = require("express");
const Customer = require("../models/Customer");
const Feedback = require("../models/Feedback");
const OrderRating = require("../models/OrderRating");
const router = express.Router();

// GET /api/customers - Get all customers with filters
router.get("/", async (req, res) => {
  try {
    const filters = {
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      search: req.query.search || null,
      city: req.query.city || null,
      province: req.query.province || null,
      gender: req.query.gender || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
      sort_by: req.query.sort_by || "created_at",
      sort_order: req.query.sort_order || "desc",
    };

    const { customers, total } = await Customer.getAll(filters);

    res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
});

// GET /api/customers/stats - Get customer statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await Customer.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer statistics",
    });
  }
});

// GET /api/customers/top - Get top customers by spending
router.get("/top", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const customers = await Customer.getTopCustomers(limit);

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Error fetching top customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top customers",
    });
  }
});

// GET /api/customers/location - Get customers by location
router.get("/location", async (req, res) => {
  try {
    const { city, province } = req.query;
    const customers = await Customer.getByLocation(city, province);

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Error fetching customers by location:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers by location",
    });
  }
});

// GET /api/customers/:id - Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.getById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
});

// GET /api/customers/:id/details - Get customer with feedback and ratings
router.get("/:id/details", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.getWithFeedbackAndRatings(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error fetching customer details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer details",
    });
  }
});

// POST /api/customers - Create new customer
router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      province,
      postal_code,
      birth_date,
      gender,
      notes,
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required fields",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.getByEmail(email);
    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Customer with this email already exists",
      });
    }

    const customerData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      province: province ? province.trim() : null,
      postal_code: postal_code ? postal_code.trim() : null,
      birth_date: birth_date || null,
      gender: gender || null,
      notes: notes ? notes.trim() : null,
    };

    const customer = await Customer.create(customerData);

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
});

// PUT /api/customers/:id - Update customer
router.put("/:id", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const {
      name,
      email,
      phone,
      address,
      city,
      province,
      postal_code,
      birth_date,
      gender,
      notes,
    } = req.body;

    // Check if customer exists
    const existingCustomer = await Customer.getById(customerId);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      // Check if email is already taken by another customer
      const emailCustomer = await Customer.getByEmail(email);
      if (emailCustomer && emailCustomer.id !== customerId) {
        return res.status(409).json({
          success: false,
          message: "Email is already taken by another customer",
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (city !== undefined) updateData.city = city ? city.trim() : null;
    if (province !== undefined) updateData.province = province ? province.trim() : null;
    if (postal_code !== undefined) updateData.postal_code = postal_code ? postal_code.trim() : null;
    if (birth_date !== undefined) updateData.birth_date = birth_date || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;

    const updatedCustomer = await Customer.update(customerId, updateData);

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
});

// DELETE /api/customers/:id - Delete customer
router.delete("/:id", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    // Check if customer exists
    const existingCustomer = await Customer.getById(customerId);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const deleted = await Customer.delete(customerId);
    if (deleted) {
      res.json({
        success: true,
        message: "Customer deleted successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to delete customer",
      });
    }
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
});

// POST /api/customers/:id/update-stats - Manually update customer statistics
router.post("/:id/update-stats", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    // Check if customer exists
    const existingCustomer = await Customer.getById(customerId);
    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await Customer.updateStats(customerId);
    const updatedCustomer = await Customer.getById(customerId);

    res.json({
      success: true,
      message: "Customer statistics updated successfully",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error("Error updating customer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer statistics",
    });
  }
});

module.exports = router;
