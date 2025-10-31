const { db } = require("../config/database");
const fs = require("fs");
const path = require("path");

async function findValidApplication() {
  try {
    console.log("Finding job applications with valid resume files...\n");

    const apps = await db("job_applications")
      .whereNotNull("resume_path")
      .select("id", "full_name", "email", "resume_path")
      .limit(10);

    console.log(`Found ${apps.length} applications with resume paths:\n`);

    let foundValid = false;
    for (const app of apps) {
      const filename = path.basename(app.resume_path);
      const filePath = path.join(__dirname, "..", "uploads", "job-applications", filename);
      const exists = fs.existsSync(filePath);

      if (exists) {
        foundValid = true;
        console.log(`✅ Application ID ${app.id}:`);
        console.log(`   Name: ${app.full_name || "N/A"}`);
        console.log(`   Email: ${app.email || "N/A"}`);
        console.log(`   Resume: ${filename}`);
        console.log(`   File exists: ${exists}`);
        console.log("");
      } else {
        console.log(`❌ Application ID ${app.id}: ${filename} - FILE MISSING`);
      }
    }

    if (!foundValid) {
      console.log("\n⚠️  No applications found with existing resume files!");
      console.log("   You may need to upload a new job application with a resume.");
    }

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    await db.destroy();
    process.exit(1);
  }
}

findValidApplication();

