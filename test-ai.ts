globalThis.import = { meta: { env: process.env } };
import { taskService } from "./src/lib/services/taskService";
import { config } from 'dotenv';
config();

async function test() {
    console.log("Starting test classification!");
    try {
        const result = await taskService.evaluateAndCreateTask({
            source: "Test Data Source",
            sheet: "Sheet1",
            columns: ["Name", "Amount", "Status"],
            row: { Name: "John Due", Amount: 25000, Status: "Pending Audit" },
            source_file_id: "test",
            source_row_key: "test-row-1",
            created_by: "3abc4f28-f53a-401c-9329-2e6312550bb9", // User id from earlier
            company_id: "539b5209-2ba8-4b43-a473-cec916655a81" // Company id
        });
        console.log("Result:", result);
    } catch (e: any) {
        console.log("Error:", e.message);
    }
}
test();
