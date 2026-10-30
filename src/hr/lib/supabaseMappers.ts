/**
 * Supabase Data Mappers for HireSlot HR Dashboard
 * Converts between PostgreSQL snake_case rows and TypeScript camelCase models.
 */

import {
  HiringDrive,
  JobRole,
  CityVacancy,
  Candidate,
  CandidateAllocation,
  InterviewSlot,
  InterviewWaitlistEntry,
  AttendanceRecord,
  AbsenceReview,
  TravelPolicyTier,
  RelocationPolicyTier,
  ExpenseClaim,
  PayrollDisbursement,
  RankingRulesConfig,
  AuditLog
} from '../types';

// Helper to convert date/timestamp to ISO string or default
export function toISOString(val: any): string {
  if (!val) return new Date().toISOString();
  try {
    return new Date(val).toISOString();
  } catch {
    return String(val);
  }
}

// 1. Hiring Drives
export function mapHiringDriveFromDB(row: any, rolesCount = 0, citiesCount = 0): HiringDrive {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description || '',
    mode: row.mode || 'HYBRID',
    status: row.status || 'ACTIVE',
    startDate: row.start_date ? String(row.start_date).split('T')[0] : '',
    endDate: row.end_date ? String(row.end_date).split('T')[0] : '',
    totalTargetHeadcount: Number(row.total_target_headcount) || 0,
    rolesCount: rolesCount || row.roles_count || 0,
    citiesCount: citiesCount || row.cities_count || 0,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at)
  };
}

export function mapHiringDriveToDB(drive: Partial<HiringDrive>): Record<string, any> {
  const row: Record<string, any> = {};
  if (drive.code !== undefined) row.code = drive.code;
  if (drive.title !== undefined) row.title = drive.title;
  if (drive.description !== undefined) row.description = drive.description;
  if (drive.mode !== undefined) row.mode = drive.mode;
  if (drive.status !== undefined) row.status = drive.status;
  if (drive.startDate !== undefined) row.start_date = drive.startDate;
  if (drive.endDate !== undefined) row.end_date = drive.endDate;
  if (drive.totalTargetHeadcount !== undefined) row.total_target_headcount = Number(drive.totalTargetHeadcount);
  row.updated_at = new Date().toISOString();
  return row;
}

// 2. Job Roles
export function mapJobRoleFromDB(row: any): JobRole {
  return {
    id: row.id,
    driveId: row.drive_id,
    title: row.title,
    department: row.department,
    bandLevel: row.band_level,
    baseSalaryMin: Number(row.base_salary_min) || 0,
    baseSalaryMax: Number(row.base_salary_max) || 0,
    currency: row.currency || 'USD',
    minYearsExperience: Number(row.min_years_experience) || 0,
    requiredSkills: Array.isArray(row.required_skills) ? row.required_skills : [],
    evaluationCriteria: row.evaluation_criteria || {
      skillMatchWeight: 40,
      experienceWeight: 25,
      assessmentWeight: 20,
      locationPrefWeight: 15
    },
    createdAt: toISOString(row.created_at)
  };
}

export function mapJobRoleToDB(role: Partial<JobRole>): Record<string, any> {
  const row: Record<string, any> = {};
  if (role.driveId !== undefined) row.drive_id = role.driveId;
  if (role.title !== undefined) row.title = role.title;
  if (role.department !== undefined) row.department = role.department;
  if (role.bandLevel !== undefined) row.band_level = role.bandLevel;
  if (role.baseSalaryMin !== undefined) row.base_salary_min = Number(role.baseSalaryMin);
  if (role.baseSalaryMax !== undefined) row.base_salary_max = Number(role.baseSalaryMax);
  if (role.currency !== undefined) row.currency = role.currency;
  if (role.minYearsExperience !== undefined) row.min_years_experience = Number(role.minYearsExperience);
  if (role.requiredSkills !== undefined) row.required_skills = role.requiredSkills;
  if (role.evaluationCriteria !== undefined) row.evaluation_criteria = role.evaluationCriteria;
  return row;
}

// 3. City Vacancies
export function mapCityVacancyFromDB(row: any): CityVacancy {
  return {
    id: row.id,
    driveId: row.drive_id,
    roleId: row.role_id,
    city: row.city,
    targetHeadcount: Number(row.target_headcount) || 0,
    bufferPercentage: Number(row.buffer_percentage) || 0,
    minBarScore: Number(row.min_bar_score) || 70,
    venueName: row.venue_name || '',
    venueAddress: row.venue_address || '',
    pointOfContactName: row.point_of_contact_name || '',
    pointOfContactPhone: row.point_of_contact_phone || '',
    createdAt: toISOString(row.created_at)
  };
}

export function mapCityVacancyToDB(vac: Partial<CityVacancy>): Record<string, any> {
  const row: Record<string, any> = {};
  if (vac.driveId !== undefined) row.drive_id = vac.driveId;
  if (vac.roleId !== undefined) row.role_id = vac.roleId;
  if (vac.city !== undefined) row.city = vac.city;
  if (vac.targetHeadcount !== undefined) row.target_headcount = Number(vac.targetHeadcount);
  if (vac.bufferPercentage !== undefined) row.buffer_percentage = Number(vac.bufferPercentage);
  if (vac.minBarScore !== undefined) row.min_bar_score = Number(vac.minBarScore);
  if (vac.venueName !== undefined) row.venue_name = vac.venueName;
  if (vac.venueAddress !== undefined) row.venue_address = vac.venueAddress;
  if (vac.pointOfContactName !== undefined) row.point_of_contact_name = vac.pointOfContactName;
  if (vac.pointOfContactPhone !== undefined) row.point_of_contact_phone = vac.pointOfContactPhone;
  return row;
}

// 4. Candidates
export function mapCandidateFromDB(row: any): Candidate {
  return {
    id: row.id,
    driveId: row.drive_id,
    roleId: row.role_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    currentCity: row.current_city,
    preferredCities: Array.isArray(row.preferred_cities) ? row.preferred_cities : [],
    relocationReadiness: row.relocation_readiness || 'HIGH',
    yearsExperience: Number(row.years_experience) || 0,
    skills: Array.isArray(row.skills) ? row.skills : [],
    assessmentScore: Number(row.assessment_score) || 0,
    resumeUrl: row.resume_url || undefined,
    isSilentlyBlocked: Boolean(row.is_silently_blocked),
    blockedReason: row.blocked_reason || undefined,
    hrExemptionGranted: Boolean(row.hr_exemption_granted),
    hrExemptionNote: row.hr_exemption_note || undefined,
    appliedDate: toISOString(row.applied_date)
  };
}

// 5. Candidate Allocations
export function mapCandidateAllocationFromDB(row: any): CandidateAllocation {
  return {
    id: row.id,
    driveId: row.drive_id,
    candidateId: row.candidate_id,
    roleId: row.role_id,
    allocatedCity: row.allocated_city,
    status: row.status,
    rank: Number(row.rank) || 1,
    matchScore: Number(row.match_score) || 0,
    recommendationBreakdown: row.recommendation_breakdown || {
      totalScore: Number(row.match_score) || 0,
      cityMatchScore: 0,
      skillMatchScore: 0,
      experienceScore: 0,
      relocationScore: 0,
      reasons: [],
      warnings: []
    },
    alternativeCity: row.alternative_city || undefined,
    alternativeCityNotes: row.alternative_city_notes || undefined,
    relocationStipendOffered: row.relocation_stipend_offered ? Number(row.relocation_stipend_offered) : undefined,
    allocatedBy: row.allocated_by || 'HR',
    allocatedAt: toISOString(row.allocated_at),
    updatedAt: toISOString(row.updated_at)
  };
}

// 6. Interview Slots
export function mapInterviewSlotFromDB(row: any): InterviewSlot {
  return {
    id: row.id,
    driveId: row.drive_id,
    roleId: row.role_id,
    city: row.city,
    slotDate: row.slot_date ? String(row.slot_date).split('T')[0] : '',
    startTime: row.start_time ? String(row.start_time).substring(0, 5) : '10:00',
    endTime: row.end_time ? String(row.end_time).substring(0, 5) : '11:00',
    interviewerName: row.interviewer_name,
    interviewerEmail: row.interviewer_email,
    roomOrLink: row.room_or_link,
    maxCapacity: Number(row.max_capacity) || 1,
    currentCandidateId: row.current_candidate_id || undefined,
    candidateName: row.candidates?.full_name || row.candidate_name || undefined,
    status: row.status || 'AVAILABLE',
    recycledFromCandidateId: row.recycled_from_candidate_id || undefined,
    recycledAt: row.recycled_at ? toISOString(row.recycled_at) : undefined,
    createdAt: toISOString(row.created_at)
  };
}

// 7. Interview Waitlist
export function mapWaitlistFromDB(row: any): InterviewWaitlistEntry {
  return {
    id: row.id,
    driveId: row.drive_id,
    candidateId: row.candidate_id,
    candidateName: row.candidates?.full_name || row.candidate_name || 'Candidate',
    city: row.city,
    roleTitle: row.candidates?.job_roles?.title || 'Engineering',
    score: Number(row.candidates?.assessment_score) || 80,
    priority: row.priority || 'STANDARD',
    waitlistedAt: toISOString(row.waitlisted_at),
    notifiedCount: Number(row.notified_count) || 0,
    recoveryAutoEligible: Boolean(row.recovery_auto_eligible),
    reasonForWaitlist: row.reason_for_waitlist || ''
  };
}

// 8. Attendance Logs
export function mapAttendanceRecordFromDB(row: any): AttendanceRecord {
  return {
    id: row.id,
    driveId: row.drive_id,
    candidateId: row.candidate_id,
    candidateName: row.candidates?.full_name || row.candidate_name || 'Candidate',
    slotId: row.slot_id,
    city: row.city,
    scheduledTime: toISOString(row.scheduled_time),
    checkInTime: row.check_in_time ? toISOString(row.check_in_time) : undefined,
    badgeNumber: row.badge_number || undefined,
    status: row.status || 'EXPECTED',
    assignedRoom: row.assigned_room || undefined,
    notes: row.notes || undefined,
    markedBy: row.marked_by || undefined
  };
}

// 9. Absence Reviews
export function mapAbsenceReviewFromDB(row: any): AbsenceReview {
  return {
    id: row.id,
    driveId: row.drive_id,
    candidateId: row.candidate_id,
    candidateName: row.candidates?.full_name || row.candidate_name || 'Candidate',
    attendanceId: row.attendance_id,
    absenceReason: row.absence_reason,
    category: row.category || 'MEDICAL',
    evidenceUrl: row.evidence_url || undefined,
    evidenceSummary: row.evidence_summary || undefined,
    submittedAt: toISOString(row.submitted_at),
    status: row.status || 'PENDING',
    hrDecisionBy: row.hr_decision_by || undefined,
    hrDecisionAt: row.hr_decision_at ? toISOString(row.hr_decision_at) : undefined,
    hrDecisionNotes: row.hr_decision_notes || undefined,
    replacementSlotId: row.replacement_slot_id || undefined
  };
}

// 10. Travel Policies
export function mapTravelPolicyFromDB(row: any): TravelPolicyTier {
  return {
    id: row.id,
    tierName: row.tier_name,
    minDistanceKm: Number(row.min_distance_km) || 0,
    maxDistanceKm: Number(row.max_distance_km) || 0,
    allowedModes: Array.isArray(row.allowed_modes) ? row.allowed_modes : ['CAB', 'TRAIN_2AC'],
    maxTicketReimbursement: Number(row.max_ticket_reimbursement) || 0,
    dailyMealsAllowance: Number(row.daily_meals_allowance) || 0,
    receiptRequiredThreshold: Number(row.receipt_required_threshold) || 25,
    notes: row.notes || ''
  };
}

// 11. Relocation Policies
export function mapRelocationPolicyFromDB(row: any): RelocationPolicyTier {
  return {
    id: row.id,
    originType: row.origin_type || 'OUTSTATION_NON_METRO',
    lumpSumRelocationAllowance: Number(row.lump_sum_relocation_allowance) || 0,
    guestHouseDays: Number(row.guest_house_days) || 0,
    shipmentMoversAllowance: Number(row.shipment_movers_allowance) || 0,
    retentionBondMonths: Number(row.retention_bond_months) || 12,
    taxAssistanceIncluded: Boolean(row.tax_assistance_included)
  };
}

// 12. Expense Claims
export function mapExpenseClaimFromDB(row: any): ExpenseClaim {
  return {
    id: row.id,
    driveId: row.drive_id,
    candidateId: row.candidate_id,
    candidateName: row.candidates?.full_name || row.candidate_name || 'Candidate',
    category: row.category || 'TRAVEL',
    claimedAmount: Number(row.claimed_amount) || 0,
    approvedAmount: row.approved_amount !== null && row.approved_amount !== undefined ? Number(row.approved_amount) : undefined,
    currency: row.currency || 'USD',
    receiptUrl: row.receipt_url || undefined,
    receiptName: row.receipt_name || 'receipt.pdf',
    expenseDate: row.expense_date ? String(row.expense_date).split('T')[0] : '',
    policyCompliance: row.policy_compliance || 'COMPLIANT',
    complianceNote: row.compliance_note || undefined,
    status: row.status || 'SUBMITTED',
    hrReviewerNotes: row.hr_reviewer_notes || undefined,
    hrReviewerName: row.hr_reviewer_name || undefined,
    reviewedAt: row.reviewed_at ? toISOString(row.reviewed_at) : undefined,
    submittedAt: toISOString(row.submitted_at)
  };
}

// 13. Payroll Disbursements
export function mapPayrollDisbursementFromDB(row: any): PayrollDisbursement {
  return {
    id: row.id,
    driveId: row.drive_id,
    batchCode: row.batch_code,
    candidateId: row.candidate_id,
    candidateName: row.candidates?.full_name || row.candidate_name || 'Candidate',
    claimId: row.claim_id,
    amount: Number(row.amount) || 0,
    currency: row.currency || 'USD',
    bankAccountMasked: row.bank_account_masked || '••••',
    paymentMethod: row.payment_method || 'NEFT',
    status: row.status || 'QUEUED',
    referenceNumber: row.reference_number || undefined,
    disbursedAt: row.disbursed_at ? toISOString(row.disbursed_at) : undefined,
    failureReason: row.failure_reason || undefined,
    createdDate: toISOString(row.created_date)
  };
}

// 14. Ranking Rules
export function mapRankingRulesFromDB(row: any): RankingRulesConfig {
  return {
    id: row.id,
    driveId: row.drive_id,
    skillMatchWeight: Number(row.skill_match_weight) ?? 35,
    experienceWeight: Number(row.experience_weight) ?? 20,
    locationMatchWeight: Number(row.location_match_weight) ?? 25,
    relocationWillingnessWeight: Number(row.relocation_willingness_weight) ?? 10,
    assessmentScoreWeight: Number(row.assessment_score_weight) ?? 10,
    prioritizeFirstPreference: Boolean(row.prioritize_first_preference),
    minPassingThreshold: Number(row.min_passing_threshold) ?? 60,
    allowBufferOverflow: Boolean(row.allow_buffer_overflow),
    maxBufferPercentage: Number(row.max_buffer_percentage) ?? 20,
    updatedAt: toISOString(row.updated_at),
    updatedBy: row.updated_by || 'HR Admin'
  };
}

// 15. Audit Logs
export function mapAuditLogFromDB(row: any): AuditLog {
  return {
    id: row.id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    details: row.details || {},
    timestamp: toISOString(row.timestamp),
    ipAddress: row.ip_address || undefined
  };
}

