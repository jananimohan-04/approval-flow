import { createServerFn } from "@tanstack/react-start";
import fs from 'fs';
import path from 'path';

export const verifyGstFn = createServerFn({ method: "POST" })
    .validator((data: { gstNumber: string }) => data)
    .handler(async ({ data }) => {
        try {
            if (!data.gstNumber || data.gstNumber.length !== 15) {
                return { success: false, error: 'Invalid GST number format.' };
            }

            let apiKey = process.env["RAPIDAPI_KEY"] || process.env["VITE_RAPIDAPI_KEY"] || (import.meta as any).env?.VITE_RAPIDAPI_KEY || (import.meta as any).env?.RAPIDAPI_KEY;

            if (!apiKey) {
                apiKey = '524e77eedcmshe66650ba6a80427p1c6098jsncc7a7f97b2c3';
            }

            console.log("verifyGstFn called with gstNumber:", data.gstNumber);
            console.log("API Key present:", !!apiKey);

            if (!apiKey) {
                console.error("API key is missing.");
                return { success: false, error: 'API key is missing.' };
            }

            const response = await fetch('https://gst-verification.p.rapidapi.com/v3/tasks/sync/verify_with_source/ind_gst_certificate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-host': 'gst-verification.p.rapidapi.com',
                    'x-rapidapi-key': apiKey
                },
                body: JSON.stringify({
                    task_id: crypto.randomUUID(),
                    group_id: crypto.randomUUID(),
                    data: { gstin: data.gstNumber }
                })
            });

            if (!response.ok) {
                console.error("RapidAPI Error:", response.status, response.statusText);
                let errorMessage = 'Failed to verify GST number with provider.';
                if (response.status === 429) errorMessage = 'API Rate Limit Exceeded.';
                if (response.status === 401 || response.status === 403) errorMessage = 'Invalid API Key.';
                return { success: false, error: errorMessage };
            }

            const result = await response.json();
            console.log("RapidAPI Result:", JSON.stringify(result).substring(0, 200));
            const sourceOutput = result?.result?.source_output;
            const companyName = sourceOutput?.legal_name || sourceOutput?.trade_name || '';

            if (!companyName) {
                return { success: false, error: 'Could not find company details.' };
            }

            return {
                success: true,
                data: {
                    organization_name: companyName,
                    gst_number: data.gstNumber,
                    trade_name: sourceOutput?.trade_name || '',
                    gstin_status: sourceOutput?.gstin_status || sourceOutput?.status || 'Active',
                    taxpayer_type: sourceOutput?.taxpayer_type || '',
                    constitution_of_business: sourceOutput?.constitution_of_business || '',
                    date_of_registration: sourceOutput?.date_of_registration || '',
                    address: sourceOutput?.principal_place_of_business_address || null
                }
            };
        } catch (error: any) {
            console.error("GST Verification Error:", error);
            return { success: false, error: error.message || "An unexpected error occurred." };
        }
    });
