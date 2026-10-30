import { SupabaseClient } from '@supabase/supabase-js';
import { RecordClaimPayoutRpc, ProcessPayrollBatchRpc } from '../../../types/database.types.js';

export interface RecordPayoutInput {
  claimId: string;
  payoutReference: string;
  bankLast4: string; // Must be strictly 4 numeric digits
  bankRoutingOrIfsc?: string;
  notes?: string;
}

export interface ProcessBatchInput {
  batchReference: string;
  claimIds?: string[];
  notes?: string;
}

export class PayoutService {
  constructor(private client: SupabaseClient) {}

  /**
   * Processes a batch of HR-approved expense claims atomically
   */
  async processPayrollBatch(input: ProcessBatchInput): Promise<ProcessPayrollBatchRpc['Returns']> {
    const { data, error } = await this.client.rpc('process_payroll_batch', {
      p_batch_reference: input.batchReference,
      p_claim_ids: input.claimIds || null,
      p_notes: input.notes || null,
    });

    if (error) {
      throw new Error(`Failed to process payroll batch: ${error.message}`);
    }

    return data as ProcessPayrollBatchRpc['Returns'];
  }

  /**
   * Records payment settlement for an HR-approved expense claim
   * Strictly validates that only masked bank details (last 4 digits) are recorded.
   */
  async recordPayout(input: RecordPayoutInput): Promise<RecordClaimPayoutRpc['Returns']> {
    // Client-side guard for 4 digits (also strictly enforced by database regex check)
    if (!/^\d{4}$/.test(input.bankLast4)) {
      throw new Error('Security Violation: Only the last 4 digits of the bank account may be recorded.');
    }

    const { data, error } = await this.client.rpc('record_claim_payout', {
      p_claim_id: input.claimId,
      p_payout_ref: input.payoutReference,
      p_bank_last4: input.bankLast4,
      p_bank_routing_or_ifsc: input.bankRoutingOrIfsc || null,
      p_notes: input.notes || null,
    });

    if (error) {
      throw new Error(`Failed to record payout: ${error.message}`);
    }

    return data as RecordClaimPayoutRpc['Returns'];
  }

  /**
   * Fetches payout tracking information for a claim
   */
  async getPayoutStatus(claimId: string) {
    const { data, error } = await this.client
      .from('claim_payouts')
      .select('id, payment_status, payout_reference, payout_amount, currency, bank_account_last4, processed_at, notes')
      .eq('claim_id', claimId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch payout status: ${error.message}`);
    }

    return data;
  }
}
