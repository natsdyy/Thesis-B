const { db } = require("../config/database");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";

async function findAvailableLink() {
  try {
    console.log("Finding available onboarding link...\n");

    // Get all hired applications
    const apps = await db("job_applications")
      .where("status", "hired")
      .select("id", "email", "full_name", "department", "position_title")
      .limit(20);

    console.log(`Found ${apps.length} hired applications. Checking for available ones...\n`);

    for (const app of apps) {
      if (!app.email) continue;

      // Check if employee already exists
      const existingEmp = await db("employees")
        .where("email", app.email)
        .whereNull("deleted_at")
        .first();

      if (!existingEmp) {
        // This application hasn't been onboarded yet!
        const token = jwt.sign(
          {
            application_id: app.id,
            email: app.email,
            type: "onboarding",
          },
          JWT_SECRET,
          { expiresIn: "30d" }
        );

        const link = `${frontendUrl}/onboard?token=${encodeURIComponent(token)}`;

        console.log("✅ Available onboarding link found!\n");
        console.log(`   Application ID: ${app.id}`);
        console.log(`   Applicant: ${app.full_name || "N/A"}`);
        console.log(`   Email: ${app.email}`);
        console.log(`   Department: ${app.department || "N/A"}`);
        console.log(`   Position: ${app.position_title || "N/A"}\n`);
        console.log("🔗 Onboarding Link:");
        console.log(link);
        console.log("\n📋 Token:");
        console.log(token);

        await db.destroy();
        process.exit(0);
      }
    }

    console.log("❌ No available applications found. All hired applications have been onboarded.");
    console.log("\n💡 Options:");
    console.log("1. Create a new job application with status 'hired'");
    console.log("2. Delete an existing employee to reuse their application");

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await db.destroy();
    process.exit(1);
  }
}

findAvailableLink();

