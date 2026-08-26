import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
import { randomUUID } from "crypto";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Creating data source File...");
    const { data: file, error: ferr } = await supabase.from("data_sources").insert({
        id: "ds-lg-1", file_name: "Accounts.xlsx", row_count: 1530, google_file_id: "google_xyz_" + Date.now(), enabled: true
    }).select().single();
    if (ferr) { console.error("File Exists or Err:", ferr.message); }

    console.log("Seeding 1050 rows in chunks...");

    let payload: any[] = [];

    // Add specific test rows
    payload.push({ id: randomUUID(), data_source_id: "ds-lg-1", sheet_name: "Invoices", row_key: "INV001", row_hash: "xx", row_data: { Invoice: "INV001", Vendor: "ABC", Amount: 10000, Status: "Pending" } });
    payload.push({ id: randomUUID(), data_source_id: "ds-lg-1", sheet_name: "Invoices", row_key: "INV002", row_hash: "xx", row_data: { Invoice: "INV002", Vendor: "XYZ", Amount: 25000, Status: "Paid" } });
    payload.push({ id: randomUUID(), data_source_id: "ds-lg-1", sheet_name: "Invoices", row_key: "INV003", row_hash: "xx", row_data: { Invoice: "INV003", Vendor: "PQR", Amount: 15000, Status: "Pending" } });

    // Populate fake noise
    for (let i = 0; i < 1050; i++) {
        payload.push({
            id: randomUUID(), data_source_id: "ds-lg-1", sheet_name: "Invoices", row_key: `RND${i}`, row_hash: "x",
            row_data: { Invoice: `RND${i}`, Vendor: "Noise Corp", Amount: 50, Status: i % 2 === 0 ? "Archived" : "Paid" }
        });
        if (payload.length === 500) {
            await supabase.from("data_source_rows").insert(payload);
            payload = [];
            console.log("Chunk inserted.");
        }
    }
    if (payload.length > 0) {
        await supabase.from("data_source_rows").insert(payload);
        console.log("Final chunk inserted.");
    }
    console.log("Done.");
}
run();
