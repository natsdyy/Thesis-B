// Quick test script: send supplier order email for a given supply_request id or request_id
// Usage:
//   node test-supplier-order-email.js --id 73
//   node test-supplier-order-email.js --request_id 1762185239202

require("dotenv").config();

const { db } = require("./backend/config/database");
const SupplyRequest = require("./backend/models/SupplyRequest");
const Supplier = require("./backend/models/Supplier");
const SendGridService = require("./backend/services/sendGridService");

async function main() {
  const args = process.argv.slice(2);
  const idArgIndex = args.indexOf("--id");
  const reqIdArgIndex = args.indexOf("--request_id");

  let request = null;

  try {
    if (idArgIndex !== -1 && args[idArgIndex + 1]) {
      const id = Number(args[idArgIndex + 1]);
      if (Number.isNaN(id)) throw new Error("Invalid --id");
      request = await SupplyRequest.getById(id);
    } else if (reqIdArgIndex !== -1 && args[reqIdArgIndex + 1]) {
      const requestId = args[reqIdArgIndex + 1];
      request = await SupplyRequest.getByRequestId(requestId);
    } else {
      throw new Error("Provide --id <numeric> or --request_id <string>");
    }

    if (!request) {
      throw new Error("Supply request not found");
    }

    if (!request.is_supplier_sourced || !request.supplier_id) {
      console.log(
        "Request is not supplier-sourced or missing supplier_id. Nothing to send."
      );
      return;
    }

    const supplier = await Supplier.getById(request.supplier_id);
    if (!supplier || !supplier.email) {
      console.log("Supplier not found or missing email.");
      return;
    }

    const result = await SendGridService.sendSupplierOrderEmail(
      supplier.email,
      supplier.contact_person || supplier.name || "Supplier",
      { request, items: request.items || [] }
    );

    console.log("Send result:", result);
  } catch (err) {
    console.error("Test failed:", err.message || err);
  } finally {
    try {
      await db.destroy();
    } catch (_) {}
  }
}

main();
