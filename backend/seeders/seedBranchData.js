const Branch = require('../models/Branch');

const seedBranches = async () => {
  try {
    console.log('🌱 Seeding branch data...');

    // Check if branches already exist
    const existingBranches = await Branch.getAll();
    if (existingBranches.length > 0) {
      console.log('📋 Branches already exist, skipping seed');
      return;
    }

    const branchData = [
      {
        name: 'Main Office',
        code: 'MAIN001',
        address: '123 Business District, Corporate Plaza',
        phone: '+1-555-0001',
        email: 'main@company.com',
        manager_name: 'John Smith',
        manager_email: 'john.smith@company.com',
        manager_phone: '+1-555-0101',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'United States',
        is_active: true,
        description: 'Main headquarters and administrative center',
        opening_hours: {
          monday: '08:00-17:00',
          tuesday: '08:00-17:00',
          wednesday: '08:00-17:00',
          thursday: '08:00-17:00',
          friday: '08:00-17:00',
          saturday: 'Closed',
          sunday: 'Closed'
        }
      },
      {
        name: 'West Coast Branch',
        code: 'WC002',
        address: '456 Innovation Drive, Tech Park',
        phone: '+1-555-0002',
        email: 'westcoast@company.com',
        manager_name: 'Sarah Johnson',
        manager_email: 'sarah.johnson@company.com',
        manager_phone: '+1-555-0102',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94105',
        country: 'United States',
        is_active: true,
        description: 'Technology and innovation hub for the west coast operations',
        opening_hours: {
          monday: '09:00-18:00',
          tuesday: '09:00-18:00',
          wednesday: '09:00-18:00',
          thursday: '09:00-18:00',
          friday: '09:00-18:00',
          saturday: 'Closed',
          sunday: 'Closed'
        }
      },
      {
        name: 'European Office',
        code: 'EU003',
        address: '789 Financial Street, Business Quarter',
        phone: '+44-20-7000-0003',
        email: 'europe@company.com',
        manager_name: 'Michael Brown',
        manager_email: 'michael.brown@company.com',
        manager_phone: '+44-20-7000-0103',
        city: 'London',
        state: 'England',
        postal_code: 'EC2A 4DP',
        country: 'United Kingdom',
        is_active: true,
        description: 'European headquarters serving EMEA region',
        opening_hours: {
          monday: '09:00-17:30',
          tuesday: '09:00-17:30',
          wednesday: '09:00-17:30',
          thursday: '09:00-17:30',
          friday: '09:00-17:30',
          saturday: 'Closed',
          sunday: 'Closed'
        }
      },
      {
        name: 'Regional Service Center',
        code: 'RSC004',
        address: '321 Service Boulevard, Industrial Zone',
        phone: '+1-555-0004',
        email: 'service@company.com',
        manager_name: 'Emily Davis',
        manager_email: 'emily.davis@company.com',
        manager_phone: '+1-555-0104',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'United States',
        is_active: true,
        description: 'Customer service and support center for the central region',
        opening_hours: {
          monday: '07:00-19:00',
          tuesday: '07:00-19:00',
          wednesday: '07:00-19:00',
          thursday: '07:00-19:00',
          friday: '07:00-19:00',
          saturday: '09:00-15:00',
          sunday: 'Closed'
        }
      },
      {
        name: 'Research & Development Lab',
        code: 'RND005',
        address: '654 Research Park, University District',
        phone: '+1-555-0005',
        email: 'rd@company.com',
        manager_name: 'Dr. Robert Wilson',
        manager_email: 'robert.wilson@company.com',
        manager_phone: '+1-555-0105',
        city: 'Boston',
        state: 'MA',
        postal_code: '02101',
        country: 'United States',
        is_active: false,
        description: 'Research and development facility (temporarily closed for renovation)',
        opening_hours: {
          monday: 'Closed',
          tuesday: 'Closed',
          wednesday: 'Closed',
          thursday: 'Closed',
          friday: 'Closed',
          saturday: 'Closed',
          sunday: 'Closed'
        }
      }
    ];

    // Insert branches
    const createdBranches = [];
    for (const branch of branchData) {
      const createdBranch = await Branch.create(branch);
      createdBranches.push(createdBranch);
    }
    
    console.log(`✅ Successfully created ${createdBranches.length} branches:`);
    createdBranches.forEach(branch => {
      console.log(`   - ${branch.name} (${branch.code}) - ${branch.is_active ? 'Active' : 'Inactive'}`);
    });

  } catch (error) {
    console.error('❌ Error seeding branches:', error);
    throw error;
  }
};

module.exports = { seedBranches };

// Run directly if this file is executed
if (require.main === module) {
  const { testConnection } = require('../config/database');
  
  (async () => {
    try {
      await testConnection();
      await seedBranches();
      console.log('🎉 Branch seeding completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('💥 Branch seeding failed:', error);
      process.exit(1);
    }
  })();
}
