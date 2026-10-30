export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      absence_cases: {
        Row: {
          booking_id: string
          candidate_id: string
          created_at: string
          explanation: string
          id: string
          proof_document_path: string | null
          reason_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["absence_case_status"]
          updated_at: string
        }
        Insert: {
          booking_id: string
          candidate_id: string
          created_at?: string
          explanation: string
          id?: string
          proof_document_path?: string | null
          reason_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["absence_case_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string
          candidate_id?: string
          created_at?: string
          explanation?: string
          id?: string
          proof_document_path?: string | null
          reason_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["absence_case_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "interview_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_cases_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_cases_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          booking_id: string
          candidate_id: string
          check_in_time: string | null
          created_at: string
          id: string
          marked_by: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          booking_id: string
          candidate_id: string
          check_in_time?: string | null
          created_at?: string
          id?: string
          marked_by: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string
          candidate_id?: string
          check_in_time?: string | null
          created_at?: string
          id?: string
          marked_by?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "interview_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          candidate_id: string
          created_at: string
          id: string
          is_overflow: boolean
          job_opening_id: string
          location_id: string
          metadata: Json
          status: string
          updated_at: string
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          is_overflow?: boolean
          job_opening_id: string
          location_id: string
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          is_overflow?: boolean
          job_opening_id?: string
          location_id?: string
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_allocations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_allocations_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_allocations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      city_vacancies: {
        Row: {
          allocated_count: number
          created_at: string
          id: string
          job_opening_id: string
          location_id: string
          total_capacity: number
          updated_at: string
        }
        Insert: {
          allocated_count?: number
          created_at?: string
          id?: string
          job_opening_id: string
          location_id: string
          total_capacity: number
          updated_at?: string
        }
        Update: {
          allocated_count?: number
          created_at?: string
          id?: string
          job_opening_id?: string
          location_id?: string
          total_capacity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_vacancies_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_vacancies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_payouts: {
        Row: {
          bank_account_last4: string
          bank_routing_or_ifsc_code: string | null
          claim_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payout_status"]
          payout_amount: number
          payout_reference: string | null
          processed_at: string | null
          processed_by: string | null
          updated_at: string
        }
        Insert: {
          bank_account_last4: string
          bank_routing_or_ifsc_code?: string | null
          claim_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payout_status"]
          payout_amount: number
          payout_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_last4?: string
          bank_routing_or_ifsc_code?: string | null
          claim_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payout_status"]
          payout_amount?: number
          payout_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_payouts_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          tax_identifier: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          tax_identifier?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          tax_identifier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_claim_items: {
        Row: {
          amount: number
          claim_id: string
          created_at: string
          currency: string
          description: string
          expense_category: string
          expense_date: string
          id: string
          receipt_storage_path: string | null
          updated_at: string
          verified_by_hr: boolean
        }
        Insert: {
          amount: number
          claim_id: string
          created_at?: string
          currency?: string
          description: string
          expense_category: string
          expense_date: string
          id?: string
          receipt_storage_path?: string | null
          updated_at?: string
          verified_by_hr?: boolean
        }
        Update: {
          amount?: number
          claim_id?: string
          created_at?: string
          currency?: string
          description?: string
          expense_category?: string
          expense_date?: string
          id?: string
          receipt_storage_path?: string | null
          updated_at?: string
          verified_by_hr?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "expense_claim_items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "expense_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_claims: {
        Row: {
          approved_amount: number | null
          booking_id: string | null
          category: Database["public"]["Enums"]["claim_category"]
          claim_method: Database["public"]["Enums"]["reimbursement_method"]
          claim_number: string
          company_id: string
          created_at: string
          currency: string
          hr_decision_notes: string | null
          hr_reviewed_at: string | null
          hr_reviewer_id: string | null
          id: string
          policy_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["claim_status"]
          submission_date: string | null
          total_claimed_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_amount?: number | null
          booking_id?: string | null
          category: Database["public"]["Enums"]["claim_category"]
          claim_method: Database["public"]["Enums"]["reimbursement_method"]
          claim_number: string
          company_id: string
          created_at?: string
          currency?: string
          hr_decision_notes?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer_id?: string | null
          id?: string
          policy_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          submission_date?: string | null
          total_claimed_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_amount?: number | null
          booking_id?: string | null
          category?: Database["public"]["Enums"]["claim_category"]
          claim_method?: Database["public"]["Enums"]["reimbursement_method"]
          claim_number?: string
          company_id?: string
          created_at?: string
          currency?: string
          hr_decision_notes?: string | null
          hr_reviewed_at?: string | null
          hr_reviewer_id?: string | null
          id?: string
          policy_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          submission_date?: string | null
          total_claimed_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "interview_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_hr_reviewer_id_fkey"
            columns: ["hr_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_permissions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          location_id: string | null
          permission_level: Database["public"]["Enums"]["hr_permission_level"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          permission_level?: Database["public"]["Enums"]["hr_permission_level"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          permission_level?: Database["public"]["Enums"]["hr_permission_level"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_hr_permissions_location_company"
            columns: ["location_id", "company_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "hr_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_bookings: {
        Row: {
          booked_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          candidate_id: string
          id: string
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          booked_at?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          candidate_id: string
          id?: string
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          booked_at?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          candidate_id?: string
          id?: string
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_bookings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          booked_count: number
          created_at: string
          end_time: string
          id: string
          interviewer_id: string
          location_id: string | null
          max_capacity: number
          meeting_link: string | null
          stage_id: string
          start_time: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          booked_count?: number
          created_at?: string
          end_time: string
          id?: string
          interviewer_id: string
          location_id?: string | null
          max_capacity?: number
          meeting_link?: string | null
          stage_id: string
          start_time: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          booked_count?: number
          created_at?: string
          end_time?: string
          id?: string
          interviewer_id?: string
          location_id?: string | null
          max_capacity?: number
          meeting_link?: string | null
          stage_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_slots_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_slots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_slots_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_stages: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          job_opening_id: string
          name: string
          stage_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          job_opening_id: string
          name: string
          stage_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          job_opening_id?: string
          name?: string
          stage_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "interview_stages_job_opening_id_fkey"
            columns: ["job_opening_id"]
            isOneToOne: false
            referencedRelation: "job_openings"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_waitlist: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          location_id: string | null
          position: number
          stage_id: string
          status: Database["public"]["Enums"]["waitlist_status"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          location_id?: string | null
          position: number
          stage_id: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          location_id?: string | null
          position?: number
          stage_id?: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_waitlist_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_waitlist_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_waitlist_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      job_openings: {
        Row: {
          company_id: string
          created_at: string
          department: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string
          company_id: string
          country: string
          created_at: string
          id: string
          name: string
          state: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          company_id: string
          country?: string
          created_at?: string
          id?: string
          name: string
          state?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          company_id?: string
          country?: string
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          metadata: Json
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          metadata?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          metadata?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      relocation_policies: {
        Row: {
          active: boolean
          cap_amount: number
          claim_category: Database["public"]["Enums"]["claim_category"]
          company_id: string
          created_at: string
          currency: string
          eligibility_criteria: Json
          id: string
          move_window_days: number
          name: string
          reimbursement_method: Database["public"]["Enums"]["reimbursement_method"]
          updated_at: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          active?: boolean
          cap_amount: number
          claim_category?: Database["public"]["Enums"]["claim_category"]
          company_id: string
          created_at?: string
          currency?: string
          eligibility_criteria?: Json
          id?: string
          move_window_days?: number
          name: string
          reimbursement_method?: Database["public"]["Enums"]["reimbursement_method"]
          updated_at?: string
          valid_from: string
          valid_to: string
        }
        Update: {
          active?: boolean
          cap_amount?: number
          claim_category?: Database["public"]["Enums"]["claim_category"]
          company_id?: string
          created_at?: string
          currency?: string
          eligibility_criteria?: Json
          id?: string
          move_window_days?: number
          name?: string
          reimbursement_method?: Database["public"]["Enums"]["reimbursement_method"]
          updated_at?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "relocation_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timed_slot_offers: {
        Row: {
          candidate_id: string
          expires_at: string
          id: string
          offered_at: string
          response_at: string | null
          slot_id: string
          status: Database["public"]["Enums"]["timed_offer_status"]
          waitlist_id: string
        }
        Insert: {
          candidate_id: string
          expires_at: string
          id?: string
          offered_at?: string
          response_at?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["timed_offer_status"]
          waitlist_id: string
        }
        Update: {
          candidate_id?: string
          expires_at?: string
          id?: string
          offered_at?: string
          response_at?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["timed_offer_status"]
          waitlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timed_slot_offers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timed_slot_offers_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timed_slot_offers_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "interview_waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_policies: {
        Row: {
          active: boolean
          cap_amount: number
          claim_category: Database["public"]["Enums"]["claim_category"]
          company_id: string
          created_at: string
          currency: string
          eligibility_criteria: Json
          id: string
          name: string
          reimbursement_method: Database["public"]["Enums"]["reimbursement_method"]
          updated_at: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          active?: boolean
          cap_amount: number
          claim_category?: Database["public"]["Enums"]["claim_category"]
          company_id: string
          created_at?: string
          currency?: string
          eligibility_criteria?: Json
          id?: string
          name: string
          reimbursement_method?: Database["public"]["Enums"]["reimbursement_method"]
          updated_at?: string
          valid_from: string
          valid_to: string
        }
        Update: {
          active?: boolean
          cap_amount?: number
          claim_category?: Database["public"]["Enums"]["claim_category"]
          company_id?: string
          created_at?: string
          currency?: string
          eligibility_criteria?: Json
          id?: string
          name?: string
          reimbursement_method?: Database["public"]["Enums"]["reimbursement_method"]
          updated_at?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _internal_promote_next_waitlisted_candidate: {
        Args: { p_slot_id: string; p_validity_minutes?: number }
        Returns: Json
      }
      allocate_candidate: {
        Args: {
          p_allow_overflow?: boolean
          p_candidate_id: string
          p_job_opening_id: string
          p_location_id: string
        }
        Returns: Json
      }
      allocate_city_vacancy: {
        Args: {
          p_count?: number
          p_job_opening_id: string
          p_location_id: string
        }
        Returns: Json
      }
      book_interview_slot: { Args: { p_slot_id: string }; Returns: Json }
      claim_timed_slot_offer: { Args: { p_offer_id: string }; Returns: Json }
      fast_fill_slot: {
        Args: {
          p_auto_confirm?: boolean
          p_slot_id: string
          p_validity_minutes?: number
        }
        Returns: Json
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_hr_permission: {
        Args: { p_company_id: string; p_location_id?: string }
        Returns: boolean
      }
      join_interview_waitlist: { Args: { p_stage_id: string }; Returns: Json }
      mark_interview_attendance: {
        Args: {
          p_booking_id: string
          p_notes?: string
          p_status: Database["public"]["Enums"]["attendance_status"]
        }
        Returns: Json
      }
      offer_slot_to_next_waitlisted: {
        Args: { p_slot_id: string; p_validity_minutes?: number }
        Returns: Json
      }
      process_expired_offers: { Args: never; Returns: number }
      process_payroll_batch: {
        Args: {
          p_batch_reference: string
          p_claim_ids?: string[]
          p_notes?: string
        }
        Returns: Json
      }
      record_claim_payout: {
        Args: {
          p_bank_last4: string
          p_bank_routing_or_ifsc?: string
          p_claim_id: string
          p_notes?: string
          p_payout_ref: string
        }
        Returns: Json
      }
      review_absence_case: {
        Args: {
          p_case_id: string
          p_decision: Database["public"]["Enums"]["absence_case_status"]
          p_review_notes?: string
        }
        Returns: Json
      }
      review_expense_claim: {
        Args: {
          p_action: string
          p_approved_amount?: number
          p_claim_id: string
          p_decision_notes?: string
          p_rejection_reason?: string
        }
        Returns: Json
      }
      submit_absence_case: {
        Args: {
          p_booking_id: string
          p_explanation: string
          p_proof_document_path?: string
          p_reason_type: string
        }
        Returns: Json
      }
      submit_expense_claim: { Args: { p_claim_id: string }; Returns: Json }
    }
    Enums: {
      absence_case_status:
        | "submitted"
        | "under_review"
        | "approved_reschedule"
        | "rejected"
      attendance_status:
        | "attended"
        | "late"
        | "absent_unexcused"
        | "absence_excused"
        | "absence_requested"
      booking_status: "confirmed" | "cancelled" | "attended" | "no_show"
      claim_category: "interview_travel" | "employee_relocation"
      claim_status:
        | "draft"
        | "submitted"
        | "under_hr_review"
        | "hr_approved"
        | "hr_rejected"
        | "payout_queued"
        | "paid"
      hr_permission_level: "viewer" | "manager" | "admin"
      payout_status: "pending" | "processed" | "failed"
      reimbursement_method: "fixed_allowance" | "actual_expenses"
      slot_status: "open" | "booked" | "cancelled" | "completed"
      timed_offer_status: "pending" | "claimed" | "expired" | "declined"
      user_role:
        | "candidate"
        | "hr_staff"
        | "interviewer"
        | "payroll_officer"
        | "admin"
      waitlist_status:
        | "waiting"
        | "offered"
        | "expired"
        | "accepted"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      absence_case_status: [
        "submitted",
        "under_review",
        "approved_reschedule",
        "rejected",
      ],
      attendance_status: [
        "attended",
        "late",
        "absent_unexcused",
        "absence_excused",
        "absence_requested",
      ],
      booking_status: ["confirmed", "cancelled", "attended", "no_show"],
      claim_category: ["interview_travel", "employee_relocation"],
      claim_status: [
        "draft",
        "submitted",
        "under_hr_review",
        "hr_approved",
        "hr_rejected",
        "payout_queued",
        "paid",
      ],
      hr_permission_level: ["viewer", "manager", "admin"],
      payout_status: ["pending", "processed", "failed"],
      reimbursement_method: ["fixed_allowance", "actual_expenses"],
      slot_status: ["open", "booked", "cancelled", "completed"],
      timed_offer_status: ["pending", "claimed", "expired", "declined"],
      user_role: [
        "candidate",
        "hr_staff",
        "interviewer",
        "payroll_officer",
        "admin",
      ],
      waitlist_status: [
        "waiting",
        "offered",
        "expired",
        "accepted",
        "cancelled",
      ],
    },
  },
} as const
