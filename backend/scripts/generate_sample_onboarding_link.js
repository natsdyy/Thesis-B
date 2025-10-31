const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

async function generateSampleLink() {
  try {
    // Try to get a real hired application from the database
    const hiredApp = await db('job_applications')
      .where('status', 'hired')
      .first();

    if (hiredApp) {
      console.log('\n✅ Found hired application in database:');
      console.log(`   Application ID: ${hiredApp.id}`);
      console.log(`   Applicant: ${hiredApp.full_name || hiredApp.applicant_name || 'N/A'}`);
      console.log(`   Email: ${hiredApp.email || hiredApp.applicant_email || 'N/A'}`);
      console.log(`   Department: ${hiredApp.department || hiredApp.department_name || 'N/A'}`);
      console.log(`   Position: ${hiredApp.position_title || hiredApp.role || 'N/A'}\n`);

      // Generate token for this application
      const token = jwt.sign(
        {
          application_id: hiredApp.id,
          email: hiredApp.email || hiredApp.applicant_email,
          type: 'onboarding',
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const link = `${frontendUrl}/onboard?token=${encodeURIComponent(token)}`;

      console.log('🔗 Sample Onboarding Link (from database):');
      console.log(link);
      console.log('\n📋 Token (for testing):');
      console.log(token);
    } else {
      // Generate a sample token with fake data
      console.log('\n⚠️  No hired applications found in database.');
      console.log('   Generating sample link with test data...\n');

      const sampleToken = jwt.sign(
        {
          application_id: 999,
          email: 'sample.applicant@example.com',
          type: 'onboarding',
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const sampleLink = `${frontendUrl}/onboard?token=${encodeURIComponent(sampleToken)}`;

      console.log('🔗 Sample Onboarding Link (test data):');
      console.log(sampleLink);
      console.log('\n📋 Token (for testing):');
      console.log(sampleToken);
      console.log('\n💡 Note: This token will fail verification because application ID 999 does not exist.');
      console.log('   Use the link generated from a real hired application for actual testing.\n');
    }

    console.log('\n📝 Link Format:');
    console.log(`${frontendUrl}/onboard?token=<JWT_TOKEN>`);
    console.log('\n✨ Features:');
    console.log('   - Token expires in 30 days');
    console.log('   - Contains application_id, email, and type');
    console.log('   - Verified on page load');
    console.log('   - Pre-fills Department, Branch, Role, Employee Type\n');
  } catch (error) {
    console.error('Error generating sample link:', error);
  } finally {
    process.exit(0);
  }
}

generateSampleLink();

