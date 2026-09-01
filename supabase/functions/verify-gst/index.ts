import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { gst_number } = await req.json()
        if (!gst_number || gst_number.length !== 15) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid GST number format.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
        }

        const response = await fetch('https://gst-verification.p.rapidapi.com/v3/tasks/sync/verify_with_source/ind_gst_certificate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': 'gst-verification.p.rapidapi.com',
                'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY_HERE' // Replace with actual key
            },
            body: JSON.stringify({
                task_id: crypto.randomUUID(),
                group_id: crypto.randomUUID(),
                data: { gstin: gst_number }
            })
        });

        if (!response.ok) {
            let errorMessage = 'Failed to verify GST number with provider.';
            if (response.status === 429) errorMessage = 'API Rate Limit Exceeded.';
            return new Response(JSON.stringify({ success: false, error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        const result = await response.json();
        const sourceOutput = result?.result?.source_output;
        const companyName = sourceOutput?.legal_name || sourceOutput?.trade_name || '';

        if (!companyName) {
            return new Response(JSON.stringify({ success: false, error: 'Could not find company details.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    organization_name: companyName,
                    gst_number: gst_number,
                    trade_name: sourceOutput?.trade_name || '',
                    gstin_status: sourceOutput?.gstin_status || sourceOutput?.status || 'Active',
                    taxpayer_type: sourceOutput?.taxpayer_type || '',
                    constitution_of_business: sourceOutput?.constitution_of_business || '',
                    date_of_registration: sourceOutput?.date_of_registration || '',
                    address: sourceOutput?.principal_place_of_business_address || null
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
})
