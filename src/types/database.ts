// ============================================================================
// HireSlot Core Architecture: Supabase Database Schema Definitions
// ============================================================================

import { JobAllocation, AllocationAuditLog, AllocationStatus } from './allocation';
import { CityVacancy, CityLocation } from './location';
import { JobRole, CandidateProfile, HrRankingWeights } from './matching';
import { WaitlistEntry } from './waitlist';
import { InterviewSlot } from './interview';

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: JobRole;
        Insert: Omit<JobRole, 'createdAt'> & { createdAt?: string };
        Update: Partial<JobRole>;
      };
      candidates: {
        Row: CandidateProfile;
        Insert: CandidateProfile;
        Update: Partial<CandidateProfile>;
      };
      cities: {
        Row: CityLocation;
        Insert: CityLocation;
        Update: Partial<CityLocation>;
      };
      city_vacancies: {
        Row: CityVacancy;
        Insert: CityVacancy;
        Update: Partial<CityVacancy>;
      };
      job_allocations: {
        Row: JobAllocation;
        Insert: Omit<JobAllocation, 'id' | 'createdAt' | 'updatedAt'> & {
          id?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: Partial<JobAllocation>;
      };
      allocation_audit_logs: {
        Row: AllocationAuditLog;
        Insert: Omit<AllocationAuditLog, 'id' | 'timestamp'> & {
          id?: string;
          timestamp?: string;
        };
        Update: Partial<AllocationAuditLog>;
      };
      waitlist_entries: {
        Row: WaitlistEntry;
        Insert: Omit<WaitlistEntry, 'id' | 'enrolledAt' | 'updatedAt'> & {
          id?: string;
          enrolledAt?: string;
          updatedAt?: string;
        };
        Update: Partial<WaitlistEntry>;
      };
      hr_ranking_rules: {
        Row: HrRankingWeights;
        Insert: HrRankingWeights;
        Update: Partial<HrRankingWeights>;
      };
      interview_slots: {
        Row: InterviewSlot;
        Insert: Omit<InterviewSlot, 'id' | 'createdAt' | 'updatedAt'> & {
          id?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: Partial<InterviewSlot>;
      };
    };
    Functions: {
      allocate_candidate_transactional: {
        Args: {
          p_candidate_id: string;
          p_job_id: string;
          p_city_id: string;
          p_match_score: number;
          p_decision_explanation: string;
        };
        Returns: {
          success: boolean;
          allocation_id: string;
          message: string;
        };
      };
      respond_to_alternative_city_offer: {
        Args: {
          p_allocation_id: string;
          p_candidate_id: string;
          p_accepted: boolean;
        };
        Returns: {
          success: boolean;
          message: string;
          new_status: AllocationStatus;
        };
      };
      release_allocation_transactional: {
        Args: {
          p_allocation_id: string;
          p_reason: string;
          p_actor: string;
        };
        Returns: {
          success: boolean;
          message: string;
        };
      };
    };
  };
}

