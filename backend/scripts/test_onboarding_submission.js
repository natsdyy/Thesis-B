/**
 * Test script to simulate an onboarding form submission
 * This creates a test employee with onboarding_status = 'pending' for review
 */

const { db } = require("../config/database");
const Employee = require("../models/Employee");
const JobApplication = require("../models/JobApplication");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

async function createDocumentsForEmployee(employeeId) {
  try {
    // Document types to upload
    const documentTypes = [
      { type: 'valid_id', name: 'Valid ID', ext: 'pdf' },
      { type: 'medical_cert', name: 'Medical Certificate', ext: 'pdf' },
      { type: 'clearance', name: 'Barangay Clearance', ext: 'pdf' }
    ];

    // Ensure documents directory exists
    const documentsDir = path.join(__dirname, "..", "uploads", "employee-documents");
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    // Upload each document
    for (const docInfo of documentTypes) {
      try {
        // Create a dummy PDF file content
        const dummyContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(${docInfo.name} for Employee ${employeeId}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000302 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
400
%%EOF`);
        
        const filename = `${docInfo.type}-${employeeId}-${Date.now()}.${docInfo.ext}`;
        const filepath = path.join(documentsDir, filename);

        // Save file to disk
        fs.writeFileSync(filepath, dummyContent);

        // Insert document record directly to database
        const [docRecord] = await db("employee_documents")
          .insert({
            employee_id: employeeId,
            document_type: docInfo.type,
            filename: filename,
            original_filename: `${docInfo.name.replace(/\s+/g, '_')}.pdf`,
            file_path: `/uploads/employee-documents/${filename}`,
            mime_type: 'application/pdf',
            file_size: dummyContent.length,
            uploaded_at: new Date(),
          })
          .returning("*");

        console.log(`  ✅ Uploaded ${docInfo.name}: ${docRecord.original_filename} (${(dummyContent.length / 1024).toFixed(2)} KB)`);
      } catch (docError) {
        console.error(`  ❌ Error uploading ${docInfo.name}:`, docError.message);
      }
    }

    console.log("\n✅ All test documents uploaded successfully!");
  } catch (uploadError) {
    console.error("⚠️  Error uploading documents:", uploadError.message);
    throw uploadError;
  }
}

async function createTestOnboardingSubmission() {
  try {
    console.log("Creating test onboarding submission...");

    // First, create or find a test job application that is "hired"
    let testApplication = await db("job_applications")
      .where("status", "hired")
      .first();

    if (!testApplication) {
      // Create a test job application
      console.log("Creating test job application...");
      const appData = {
        full_name: "Test Applicant",
        email: `test.onboarding.${Date.now()}@example.com`,
        phone: "09123456789",
        position_title: "Staff",
        department: "Finance",
        status: "hired",
        application_date: new Date(),
      };

      const [appId] = await db("job_applications").insert(appData).returning("id");
      testApplication = await db("job_applications").where("id", appId).first();
      console.log(`Created test application with ID: ${testApplication.id}`);
    }

    // Generate a test token
    const token = jwt.sign(
      {
        application_id: testApplication.id,
        email: testApplication.email || testApplication.applicant_email,
        type: "onboarding"
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Get role_id and branch_id
    const role = await db("user_roles")
      .where("department", testApplication.department || "Finance")
      .where("role", testApplication.position_title || "Staff")
      .whereNull("deleted_at")
      .first();

    if (!role) {
      throw new Error("No role found for the test application");
    }

    const mainBranch = await db("branches")
      .whereRaw("LOWER(name) = LOWER(?)", ["Main Branch"])
      .whereNull("deleted_at")
      .first();

    // Create test employee data (simulating onboarding form submission)
    const testEmployeeData = {
      first_name: `Test${Math.floor(Math.random() * 1000)}`,
      middle_name: "Onboarding",
      last_name: "Employee",
      email: `test.onboarding.${Date.now()}@example.com`,
      phone_number: "09123456789",
      address: "123 Test Street, Test City",
      postal_code: "1234",
      civil_status: "Single",
      sex: "Male",
      birthday: "1990-01-01",
      age: "34",
      citizenship: "Filipino",
      department: testApplication.department || "Finance",
      role_id: role.role_id,
      branch_id: mainBranch?.id || null,
      employee_type: "Full-time",
      sss_number: `12-${Math.floor(Math.random() * 1000000)}-0`,
      pagibig_number: `1212-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
      philhealth_number: `12-${Math.floor(Math.random() * 1000000000)}-2`,
      emergency_contact_name: "Test Emergency Contact",
      emergency_relationship: "Parent",
      emergency_contact_number: "09123456789",
      emergency_contact_address: "123 Emergency Street",
      emergency_contact_email: "emergency@example.com",
      onboarding_status: "pending", // This marks it as pending review
    };

    // Check if employee already exists
    const existing = await db("employees")
      .where("email", testEmployeeData.email)
      .whereNull("deleted_at")
      .first();

    if (existing) {
      console.log("Employee already exists, updating onboarding_status...");
      await db("employees")
        .where("id", existing.id)
        .update({
          onboarding_status: "pending",
          updated_at: db.fn.now()
        });
      console.log(`✅ Updated existing employee with onboarding_status = 'pending'`);
      console.log(`Employee ID: ${existing.employee_id}`);
      console.log(`Database ID: ${existing.id}`);
      console.log(`Email: ${existing.email}`);

      // Check if documents exist, if not create them
      const existingDocs = await db("employee_documents")
        .where("employee_id", existing.id)
        .whereNull("deleted_at")
        .count("id as count")
        .first();

      if (!existingDocs || parseInt(existingDocs.count) === 0) {
        console.log("\n📄 Creating documents for existing employee...");
        await createDocumentsForEmployee(existing.id);
      } else {
        console.log(`\n📄 Employee already has ${existingDocs.count} documents`);
      }
    } else {
      // Create new employee
      const employee = await Employee.create(testEmployeeData, null);
      console.log("✅ Test onboarding submission created successfully!");
      console.log(`Employee ID: ${employee.employee_id}`);
      console.log(`Database ID: ${employee.id}`);
      console.log(`Email: ${employee.email}`);
      console.log(`Onboarding Status: pending (ready for HR review)`);

      // Upload dummy documents for the new employee
      console.log("\n📄 Uploading test documents...");
      await createDocumentsForEmployee(employee.id);
    }

    console.log("\n📋 Next steps:");
    console.log("1. Go to HR > Job Application Management");
    console.log("2. Click 'Review Onboarding' button");
    console.log("3. Find the test submission (email: test.onboarding.*@example.com)");
    console.log("4. Click 'View' to see the uploaded documents");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test submission:", error);
    process.exit(1);
  }
}

// Run the script
createTestOnboardingSubmission();

