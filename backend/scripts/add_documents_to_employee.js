const { db } = require("../config/database");
const fs = require("fs");
const path = require("path");

async function addDocuments() {
  try {
    const employeeId = process.argv[2] ? parseInt(process.argv[2]) : 65; // Default to employee 65 or pass as argument
    // Get employee by ID
    const employee = await db("employees").where("id", employeeId).first();
    
    if (!employee) {
      console.log(`Employee ${employeeId} not found!`);
      await db.destroy();
      process.exit(1);
    }

    console.log(`Adding documents to Employee ${employee.id} (${employee.email})...\n`);

    // Document types
    const documentTypes = [
      { type: 'valid_id', name: 'Valid ID', ext: 'pdf' },
      { type: 'medical_cert', name: 'Medical Certificate', ext: 'pdf' },
      { type: 'clearance', name: 'Barangay Clearance', ext: 'pdf' }
    ];

    const documentsDir = path.join(__dirname, "..", "uploads", "employee-documents");
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    for (const docInfo of documentTypes) {
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
      fs.writeFileSync(filepath, dummyContent);

      await db("employee_documents").insert({
        employee_id: employeeId,
        document_type: docInfo.type,
        filename: filename,
        original_filename: `${docInfo.name.replace(/\s+/g, '_')}.pdf`,
        file_path: `/uploads/employee-documents/${filename}`,
        mime_type: 'application/pdf',
        file_size: dummyContent.length,
        uploaded_at: new Date(),
      });

      console.log(`✅ Added ${docInfo.name}`);
    }

    console.log("\n✅ All documents added successfully!");
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await db.destroy();
    process.exit(1);
  }
}

addDocuments();

