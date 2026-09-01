import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { verifyGstFn } from '@/lib/services/gstService';

interface GSTDetails {
    organization_name: string;
    gst_number: string;
    trade_name: string;
    gstin_status: string;
    taxpayer_type: string;
    constitution_of_business: string;
    date_of_registration: string;
    address: any;
}

export function GSTVerification({ onVerified }: { onVerified?: (details: GSTDetails) => void }) {
    const [gstNumber, setGstNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [details, setDetails] = useState<GSTDetails | null>(null);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (gstNumber.length !== 15) {
            toast.error('GST number must be exactly 15 characters.');
            return;
        }

        setIsLoading(true);
        setDetails(null);

        try {
            // Check for duplicates first
            const { data: existing, error: dbError } = await supabase
                .from('companies')
                .select('id')
                .eq('gst_number', gstNumber)
                .maybeSingle();

            if (dbError) throw dbError;
            if (existing) {
                toast.error('This GST number is already registered.');
                setIsLoading(false);
                return;
            }

            const data = await verifyGstFn({ data: { gstNumber } });

            if (data && data.success) {
                setDetails(data.data);
                toast.success('GST details fetched successfully.');
            } else {
                toast.error(data?.error || 'Failed to verify GST number.');
            }
        } catch (error: any) {
            console.error('GST Verification error:', error);
            toast.error(error.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!details) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .insert({
                    name: details.organization_name,
                    gst_number: details.gst_number,
                    trade_name: details.trade_name,
                    gstin_status: details.gstin_status,
                    taxpayer_type: details.taxpayer_type,
                    constitution_of_business: details.constitution_of_business,
                    date_of_registration: details.date_of_registration,
                    address: details.address,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Company registered successfully!');
            if (onVerified) {
                onVerified(details);
            }
            setDetails(null);
            setGstNumber('');
        } catch (error: any) {
            console.error('Error saving company:', error);
            toast.error(error.message || 'Failed to save company details.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleVerify} className="flex gap-2">
                <div className="flex-1">
                    <Label htmlFor="gstNumber" className="sr-only">GST Number</Label>
                    <Input
                        id="gstNumber"
                        placeholder="Enter 15-character GST Number"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                        maxLength={15}
                        disabled={isLoading}
                    />
                </div>
                <Button type="submit" disabled={isLoading || gstNumber.length !== 15}>
                    {isLoading ? 'Verifying...' : 'Verify'}
                </Button>
            </form>

            {details && (
                <Card>
                    <CardHeader>
                        <CardTitle>Company Details</CardTitle>
                        <CardDescription>Review the fetched details before confirming.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="font-semibold">Legal Name:</div>
                            <div>{details.organization_name}</div>

                            <div className="font-semibold">Trade Name:</div>
                            <div>{details.trade_name || 'N/A'}</div>

                            <div className="font-semibold">Status:</div>
                            <div>{details.gstin_status}</div>

                            <div className="font-semibold">Taxpayer Type:</div>
                            <div>{details.taxpayer_type}</div>

                            <div className="font-semibold">Business Type:</div>
                            <div>{details.constitution_of_business}</div>

                            <div className="font-semibold">Registration Date:</div>
                            <div>{details.date_of_registration}</div>
                        </div>
                        {details.address && (
                            <div className="mt-2">
                                <div className="font-semibold">Address:</div>
                                <div className="text-muted-foreground">
                                    {typeof details.address === 'string' ? details.address : JSON.stringify(details.address)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleConfirm} className="w-full" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Confirm & Save'}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
