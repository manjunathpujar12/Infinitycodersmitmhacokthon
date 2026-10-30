import { SupabaseClient } from '@supabase/supabase-js';
import {
  ClaimCategory,
  ReimbursementMethod,
  SubmitExpenseClaimRpc,
  ReviewExpenseClaimRpc,
} from '../../../types/database.types.js';

export interface CreateClaimInput {
  claimNumber: string;
  companyId: string;
  category: ClaimCategory;
  policyId: string;
  claimMethod: ReimbursementMethod;
  bookingId?: string;
  currency?: string;
}

export interface AddClaimItemInput {
  claimId: string;
  category: 'flight' | 'train' | 'hotel' | 'local_transit' | 'packers_movers' | 'meals' | 'temporary_housing' | 'other';
  expenseDate: string;
  amount: number;
  currency?: string;
  description: string;
  receiptStoragePath?: string;
}

export class ClaimService {
  constructor(private client: SupabaseClient) {}

  /**
   * Creates a new draft expense claim for the current authenticated user
   */
  async createDraftClaim(input: CreateClaimInput) {
    const {
      data: { user },
      error: userError,
    } = await this.client.auth.getUser();

    if (userError || !user) {
      throw new Error('Authenticated user required to create claim.');
    }

    const { data, error } = await this.client
      .from('expense_claims')
      .insert({
        claim_number: input.claimNumber,
        user_id: user.id,
        company_id: input.companyId,
        category: input.category,
        policy_id: input.policyId,
        booking_id: input.bookingId || null,
        claim_method: input.claimMethod,
        status: 'draft',
        currency: input.currency || 'USD',
        total_claimed_amount: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create draft claim: ${error.message}`);
    }

    return data;
  }

  /**
   * Adds an expense line item to a draft claim
   */
  async addClaimItem(input: AddClaimItemInput) {
    const { data, error } = await this.client
      .from('expense_claim_items')
      .insert({
        claim_id: input.claimId,
        expense_category: input.category,
        expense_date: input.expenseDate,
        amount: input.amount,
        currency: input.currency || 'USD',
        description: input.description,
        receipt_storage_path: input.receiptStoragePath || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add claim item: ${error.message}`);
    }

    return data;
  }

  /**
   * Submits a claim for HR review
   */
  async submitClaim(claimId: string): Promise<SubmitExpenseClaimRpc['Returns']> {
    const { data, error } = await this.client.rpc('submit_expense_claim', {
      p_claim_id: claimId,
    });

    if (error) {
      throw new Error(`Failed to submit claim: ${error.message}`);
    }

    return data as SubmitExpenseClaimRpc['Returns'];
  }

  /**
   * HR review and decision (approve or reject) with cap validation
   */
  async reviewClaim(
    claimId: string,
    action: 'approve' | 'reject',
    approvedAmount?: number,
    decisionNotes?: string,
    rejectionReason?: string
  ): Promise<ReviewExpenseClaimRpc['Returns']> {
    const { data, error } = await this.client.rpc('review_expense_claim', {
      p_claim_id: claimId,
      p_action: action,
      p_approved_amount: approvedAmount || null,
      p_decision_notes: decisionNotes || null,
      p_rejection_reason: rejectionReason || null,
    });

    if (error) {
      throw new Error(`HR review error: ${error.message}`);
    }

    return data as ReviewExpenseClaimRpc['Returns'];
  }

  /**
   * Uploads a receipt file into the private 'claim-receipts' storage bucket
   */
  async uploadReceipt(
    userId: string,
    claimId: string,
    fileName: string,
    fileBuffer: Buffer | Blob,
    contentType: string = 'application/pdf'
  ): Promise<string> {
    const filePath = `${userId}/${claimId}/${fileName}`;

    const { error } = await this.client.storage
      .from('claim-receipts')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return filePath;
  }
}
