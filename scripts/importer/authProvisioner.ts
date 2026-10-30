/**
 * Supabase Admin Auth Provisioner
 * HireSlot Backend Infrastructure
 *
 * Securely manages the creation of synthetic candidate, interviewer,
 * and HR administrator Auth users using Supabase Admin Auth API.
 *
 * CRITICAL SAFETY RULES:
 * 1. Supports dry-run mode (zero network calls, zero Auth user creation).
 * 2. In live mode, uses admin.createUser with email_confirm: true (no emails dispatched).
 * 3. Never trusts user metadata for role assignment. Privileged roles are granted
 *    strictly via trusted administrative operations.
 * 4. Idempotent on reruns: queries existing profiles by email before creating.
 */

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProvisionedUser {
  legacyId: string;
  email: string;
  fullName: string;
  phone?: string;
  authUuid: string;
  role: 'candidate' | 'interviewer' | 'hr_staff' | 'admin';
}

/**
 * Deterministically generates a RFC-4122 compliant UUIDv5-like string
 * from an input string and fixed namespace. Used during dry-run and identity mapping.
 */
export function generateDeterministicUuid(input: string, namespace = 'hireslot-synthetic-auth'): string {
  const hash = createHash('sha1').update(`${namespace}:${input}`).digest('hex');
  // Format as standard UUID 8-4-4-4-12
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    // version 5
    '5' + hash.substring(13, 16),
    // variant 1 (RFC 4122)
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-');
}

export class AuthProvisioner {
  private candidateUuidMap: Map<string, string> = new Map();
  private interviewerUuid?: string;
  private hrAdminUuid?: string;

  constructor(
    private supabaseAdmin?: SupabaseClient,
    private isDryRun: boolean = true
  ) {}

  getCandidateUuid(legacyId: string): string | undefined {
    return this.candidateUuidMap.get(legacyId);
  }

  getInterviewerUuid(): string | undefined {
    return this.interviewerUuid;
  }

  getHrAdminUuid(): string | undefined {
    return this.hrAdminUuid;
  }

  getAllCandidateUuids(): Map<string, string> {
    return new Map(this.candidateUuidMap);
  }

  /**
   * Dry-run simulation: populates deterministic UUIDs for all candidates
   * and synthetic staff accounts without contacting Supabase Auth.
   */
  simulateDryRunProvisioning(
    candidates: Array<{ candidate_id: string; email: string; full_name: string; phone: string }>
  ): {
    candidateCount: number;
    interviewerUuid: string;
    hrAdminUuid: string;
    sampleMappings: Array<{ legacyId: string; email: string; uuid: string }>;
  } {
    // 1. Technical Interviewer Account
    this.interviewerUuid = generateDeterministicUuid('interviewer.tech@hireslot.internal');

    // 2. HR Administrator Account
    this.hrAdminUuid = generateDeterministicUuid('hr.admin@hireslot.internal');

    // 3. 500 Candidate Accounts
    const sampleMappings: Array<{ legacyId: string; email: string; uuid: string }> = [];

    for (const c of candidates) {
      const uuid = generateDeterministicUuid(c.email);
      this.candidateUuidMap.set(c.candidate_id, uuid);

      if (sampleMappings.length < 5) {
        sampleMappings.push({ legacyId: c.candidate_id, email: c.email, uuid });
      }
    }

    return {
      candidateCount: this.candidateUuidMap.size,
      interviewerUuid: this.interviewerUuid,
      hrAdminUuid: this.hrAdminUuid,
      sampleMappings,
    };
  }

  /**
   * Live execution: provisions users via Supabase Admin Auth API
   * ONLY invoked when dryRun === false and explicitly approved.
   */
  async provisionLiveUsers(
    candidates: Array<{ candidate_id: string; email: string; full_name: string; phone: string }>
  ): Promise<{ candidateCount: number; interviewerUuid: string; hrAdminUuid: string }> {
    if (this.isDryRun || !this.supabaseAdmin) {
      throw new Error('Safety Guard: Cannot execute live user provisioning in dry-run mode.');
    }

    // Step 1: Ensure Technical Interviewer account
    const interviewerEmail = 'interviewer.tech@hireslot.internal';
    let interviewerId: string;

    const { data: existingInterviewer } = await this.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', interviewerEmail)
      .maybeSingle();

    if (existingInterviewer) {
      interviewerId = existingInterviewer.id;
    } else {
      const { data: newUser, error } = await this.supabaseAdmin.auth.admin.createUser({
        email: interviewerEmail,
        password: `InitStaff!${Math.random().toString(36).substring(2)}123`,
        email_confirm: true,
        user_metadata: { full_name: 'Alex Interviewer (Synthetic)' },
      });
      if (error || !newUser.user) {
        throw new Error(`Failed to create interviewer auth user: ${error?.message}`);
      }
      interviewerId = newUser.user.id;

      // Administrative Role Elevation: Elevate to interviewer role
      await this.supabaseAdmin
        .from('profiles')
        .update({ role: 'interviewer' })
        .eq('id', interviewerId);
    }
    this.interviewerUuid = interviewerId;

    // Step 2: Ensure HR Administrator account
    const hrEmail = 'hr.admin@hireslot.internal';
    let hrId: string;

    const { data: existingHr } = await this.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', hrEmail)
      .maybeSingle();

    if (existingHr) {
      hrId = existingHr.id;
    } else {
      const { data: newUser, error } = await this.supabaseAdmin.auth.admin.createUser({
        email: hrEmail,
        password: `InitHR!${Math.random().toString(36).substring(2)}123`,
        email_confirm: true,
        user_metadata: { full_name: 'Carol HR Administrator (Synthetic)' },
      });
      if (error || !newUser.user) {
        throw new Error(`Failed to create HR auth user: ${error?.message}`);
      }
      hrId = newUser.user.id;

      // Administrative Role Elevation: Elevate to hr_staff role
      await this.supabaseAdmin
        .from('profiles')
        .update({ role: 'hr_staff' })
        .eq('id', hrId);
    }
    this.hrAdminUuid = hrId;

    // Step 3: Provision Candidates in batches of 25 (idempotent, query before insert)
    const chunkSize = 25;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (candidate) => {
          const { data: existingProfile } = await this.supabaseAdmin!
            .from('profiles')
            .select('id')
            .eq('email', candidate.email)
            .maybeSingle();

          if (existingProfile) {
            this.candidateUuidMap.set(candidate.candidate_id, existingProfile.id);
            return;
          }

          const { data: newUser, error } = await this.supabaseAdmin!.auth.admin.createUser({
            email: candidate.email,
            password: `CandAuth!${Math.random().toString(36).substring(2)}999`,
            email_confirm: true,
            user_metadata: {
              full_name: candidate.full_name,
              phone: candidate.phone,
            },
          });

          if (error || !newUser.user) {
            throw new Error(`Failed to provision candidate ${candidate.email}: ${error?.message}`);
          }

          this.candidateUuidMap.set(candidate.candidate_id, newUser.user.id);
        })
      );
    }

    return {
      candidateCount: this.candidateUuidMap.size,
      interviewerUuid: this.interviewerUuid,
      hrAdminUuid: this.hrAdminUuid,
    };
  }
}
