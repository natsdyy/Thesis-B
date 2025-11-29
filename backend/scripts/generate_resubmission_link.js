const { db } = require('../config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

async function generateResubmissionLink() {
  try {
    // Find Charles Alves
    const employee = await db("employees")
      .where(function() {
        this.where("first_name", "LIKE", "%Charles%")
            .andWhere("last_name", "LIKE", "%Alves%");
      })
      .whereNull("deleted_at")
      .first();

    if (!employee) {
      console.log("❌ Employee 'Charles Alves' not found!");
      console.log("\nAvailable employees with 'Charles' or 'Alves':");
      const similar = await db("employees")
        .where(function() {
          this.where("first_name", "LIKE", "%Charles%")
              .orWhere("last_name", "LIKE", "%Alves%")
              .orWhere("last_name", "LIKE", "%Charles%")
              .orWhere("first_name", "LIKE", "%Alves%");
        })
        .whereNull("deleted_at")
        .select("id", "first_name", "last_name", "email", "onboarding_status", "is_active");
      console.table(similar);
      await db.destroy();
      process.exit(1);
    }

    console.log("✅ Found employee:", {
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      onboarding_status: employee.onboarding_status,
      is_active: employee.is_active
    });

    // Find the original job application
    const application = await db("job_applications")
      .where("email", employee.email)
      .orderBy("created_at", "desc")
      .first();

    if (!application) {
      console.log("⚠️  No job application found for this employee");
      console.log("   Creating resubmission link anyway with employee data...");
      
      // Generate token with employee data
      const token = jwt.sign(
        {
          application_id: null, // No application found
          email: employee.email,
          type: "onboarding",
          resubmission: true,
          employee_id: employee.id
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
      const resubmissionLink = `${frontendUrl}/onboard?token=${token}`;

      console.log("\n📧 Resubmission Link:");
      console.log(resubmissionLink);
      console.log("\n⚠️  Note: This link may not work properly without a valid application_id");
      await db.destroy();
      process.exit(0);
    }

    // Generate resubmission token
    const token = jwt.sign(
      {
        application_id: application.id,
        email: employee.email,
        type: "onboarding",
        resubmission: true,
        employee_id: employee.id
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    const resubmissionLink = `${frontendUrl}/onboard?token=${token}`;

    console.log("\n📧 Resubmission Link Generated:");
    console.log("=" .repeat(80));
    console.log(resubmissionLink);
    console.log("=" .repeat(80));
    console.log("\n📋 Details:");
    console.log(`   Employee: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Application ID: ${application.id}`);
    console.log(`   Current Status: ${employee.onboarding_status || 'N/A'}`);
    console.log(`   Account Active: ${employee.is_active ? 'Yes' : 'No'}`);
    console.log(`   Token Expires: 30 days from now`);
    console.log("\n✅ Link ready for testing!");

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await db.destroy();
    process.exit(1);
  }
}

generateResubmissionLink();

