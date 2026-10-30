/**
 * Data Parsers, Normalizers and Transformers for HireSense AI Dataset
 * HireSlot Backend Infrastructure
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  RawCandidate,
  RawJob,
  RawApplication,
  RawLocationPreference,
  RawRecruitmentEvent,
  RawInterviewSlot,
  RawInterview,
  RawAttendance,
  RawHiringOutcome,
  TransformedLocation,
  TransformedProfile,
  TransformedJobOpening,
  TransformedCityVacancy,
  TransformedInterviewStage,
  TransformedInterviewSlot,
  TransformedBooking,
  TransformedWaitlist,
  TransformedAttendance,
  TransformedAbsenceCase,
} from './types.js';
import { generateDeterministicUuid } from './authProvisioner.js';

/**
 * Robust CSV Line Parser supporting quoted cells and commas
 */
export function parseCsv<T>(filePath: string): T[] {
  if (!existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const records: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === headers.length) {
      const record: Record<string, string> = {};
      for (let h = 0; h < headers.length; h++) {
        record[headers[h].trim()] = values[h].trim();
      }
      records.push(record as unknown as T);
    }
  }

  return records;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

export function parseJson<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`JSON file not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * Combines date string and time string into standard ISO-8601 with India timezone offset (+05:30)
 */
export function combineDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr.trim();
  const formattedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  return `${cleanDate}T${formattedTime}+05:30`;
}

/**
 * Splits semicolon-delimited skills into clean string array
 */
export function parseSkills(skillsStr: string): string[] {
  if (!skillsStr) return [];
  return skillsStr
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Standard Indian City Hubs referenced by HireSense
 */
export const HIKESENSE_LOCATIONS = [
  'Mysore',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Delhi',
  'Mumbai',
  'Kochi',
] as const;

export interface ParsedDatasetBundle {
  candidates: RawCandidate[];
  jobs: RawJob[];
  applications: RawApplication[];
  locationPreferences: RawLocationPreference[];
  events: RawRecruitmentEvent[];
  slots: RawInterviewSlot[];
  interviews: RawInterview[];
  attendance: RawAttendance[];
  outcomes: RawHiringOutcome[];
  syntheticResumeRecords: Record<string, unknown>[];
}

export function loadAllDatasetFiles(baseDir: string): ParsedDatasetBundle {
  const datasetsDir = join(baseDir, 'datasets');

  return {
    candidates: parseCsv<RawCandidate>(join(datasetsDir, 'candidates.csv')),
    jobs: parseCsv<RawJob>(join(datasetsDir, 'jobs.csv')),
    applications: parseCsv<RawApplication>(join(datasetsDir, 'applications.csv')),
    locationPreferences: parseCsv<RawLocationPreference>(join(datasetsDir, 'location_preferences.csv')),
    events: parseCsv<RawRecruitmentEvent>(join(datasetsDir, 'recruitment_events.csv')),
    slots: parseCsv<RawInterviewSlot>(join(datasetsDir, 'interview_slots.csv')),
    interviews: parseCsv<RawInterview>(join(datasetsDir, 'interviews.csv')),
    attendance: parseCsv<RawAttendance>(join(datasetsDir, 'attendance.csv')),
    outcomes: parseCsv<RawHiringOutcome>(join(datasetsDir, 'hiring_outcomes.csv')),
    syntheticResumeRecords: parseJson<Record<string, unknown>[]>(join(datasetsDir, 'synthetic_resume_records.json')),
  };
}

export function transformLocations(companyId: string): Map<string, TransformedLocation> {
  const locationMap = new Map<string, TransformedLocation>();

  for (const city of HIKESENSE_LOCATIONS) {
    const locId = generateDeterministicUuid(`${companyId}:${city}`);
    locationMap.set(city, {
      id: locId,
      company_id: companyId,
      name: `${city} Tech Hub`,
      city: city,
      country: 'India',
      timezone: 'Asia/Kolkata',
    });
  }

  return locationMap;
}

export function transformCandidates(
  rawCandidates: RawCandidate[],
  candidateUuidMap: Map<string, string>,
  applications: RawApplication[],
  preferences: RawLocationPreference[],
  outcomes: RawHiringOutcome[],
  syntheticRecords: Record<string, unknown>[]
): TransformedProfile[] {
  // Index applications, preferences, outcomes, and resume records by candidate_id
  const appByCandidate = new Map<string, RawApplication[]>();
  for (const a of applications) {
    const list = appByCandidate.get(a.candidate_id) || [];
    list.push(a);
    appByCandidate.set(a.candidate_id, list);
  }

  const prefByCandidate = new Map<string, RawLocationPreference[]>();
  for (const p of preferences) {
    const list = prefByCandidate.get(p.candidate_id) || [];
    list.push(p);
    prefByCandidate.set(p.candidate_id, list);
  }

  const outcomeByCandidate = new Map<string, RawHiringOutcome[]>();
  for (const o of outcomes) {
    const list = outcomeByCandidate.get(o.candidate_id) || [];
    list.push(o);
    outcomeByCandidate.set(o.candidate_id, list);
  }

  const resumeMap = new Map<string, Record<string, unknown>>();
  for (const r of syntheticRecords) {
    if (r.candidate_id && typeof r.candidate_id === 'string') {
      resumeMap.set(r.candidate_id, r);
    }
  }

  return rawCandidates.map((c) => {
    const authUuid = candidateUuidMap.get(c.candidate_id);
    if (!authUuid) {
      throw new Error(`Missing Auth UUID mapping for candidate ${c.candidate_id}`);
    }

    const candidateApps = (appByCandidate.get(c.candidate_id) || []).map((a) => ({
      application_id: a.application_id,
      job_id: a.job_id,
      applied_date: a.applied_date,
      application_status: a.application_status,
      source_channel: a.source_channel,
    }));

    const candidatePrefs = (prefByCandidate.get(c.candidate_id) || []).map((p) => ({
      preference_id: p.preference_id,
      preferred_location: p.preferred_location,
      priority: parseInt(p.priority, 10) || 1,
    }));

    const candidateOutcomes = (outcomeByCandidate.get(c.candidate_id) || []).map((o) => ({
      outcome_id: o.outcome_id,
      interview_id: o.interview_id,
      interview_result: o.interview_result,
      final_status: o.final_status,
    }));

    return {
      id: authUuid,
      email: c.email,
      full_name: c.full_name,
      phone: c.phone,
      role: 'candidate',
      metadata: {
        legacy_id: c.candidate_id,
        education: c.education,
        degree: c.degree,
        college: c.college,
        graduation_year: parseInt(c.graduation_year, 10) || 2024,
        experience_level: c.experience_level,
        experience_years: parseFloat(c.experience_years) || 0,
        skills: parseSkills(c.skills),
        current_location: c.current_location,
        relocation_willing: c.relocation_willing.toLowerCase() === 'true',
        registration_date: c.registration_date,
        resume_storage_path: `resumes/${authUuid}/resume.pdf`,
        applications: candidateApps,
        location_preferences: candidatePrefs,
        hiring_outcomes: candidateOutcomes,
        resume_profile: resumeMap.get(c.candidate_id) || {},
        is_synthetic_demo: true,
      },
    };
  });
}

export function transformJobsAndVacancies(
  rawJobs: RawJob[],
  companyId: string,
  locationMap: Map<string, TransformedLocation>
): {
  jobs: TransformedJobOpening[];
  vacancies: TransformedCityVacancy[];
  stages: TransformedInterviewStage[];
  jobIdMap: Map<string, string>;
  stageIdMap: Map<string, string>;
} {
  const jobs: TransformedJobOpening[] = [];
  const vacancies: TransformedCityVacancy[] = [];
  const stages: TransformedInterviewStage[] = [];
  const jobIdMap = new Map<string, string>();
  const stageIdMap = new Map<string, string>();

  for (const j of rawJobs) {
    const jobUuid = generateDeterministicUuid(`${companyId}:${j.job_id}`);
    jobIdMap.set(j.job_id, jobUuid);

    const location = locationMap.get(j.location);
    if (!location) {
      throw new Error(`Location ${j.location} for job ${j.job_id} not found in location mapping.`);
    }

    jobs.push({
      id: jobUuid,
      company_id: companyId,
      title: j.job_role,
      department: 'Engineering',
      description: j.description,
      is_active: j.status.toLowerCase() === 'open',
    });

    const vacancyUuid = generateDeterministicUuid(`${jobUuid}:${location.id}`);
    vacancies.push({
      id: vacancyUuid,
      job_opening_id: jobUuid,
      location_id: location.id,
      total_capacity: parseInt(j.vacancies, 10) || 0,
      allocated_count: 0,
    });

    // Create standard interview stage 1 for each job opening
    const stageUuid = generateDeterministicUuid(`${jobUuid}:stage_1`);
    stageIdMap.set(j.job_id, stageUuid);

    stages.push({
      id: stageUuid,
      job_opening_id: jobUuid,
      name: 'Technical System Evaluation',
      stage_order: 1,
      duration_minutes: 30,
    });
  }

  return { jobs, vacancies, stages, jobIdMap, stageIdMap };
}

export function transformSlots(
  rawSlots: RawInterviewSlot[],
  locationMap: Map<string, TransformedLocation>,
  interviewerId: string,
  defaultStageId: string
): { slots: TransformedInterviewSlot[]; slotIdMap: Map<string, string> } {
  const slots: TransformedInterviewSlot[] = [];
  const slotIdMap = new Map<string, string>();

  for (const s of rawSlots) {
    const slotUuid = generateDeterministicUuid(s.slot_id);
    slotIdMap.set(s.slot_id, slotUuid);

    const loc = locationMap.get(s.location);
    const startTimeIso = combineDateTime(s.interview_date, s.start_time);
    const endTimeIso = combineDateTime(s.interview_date, s.end_time);

    slots.push({
      id: slotUuid,
      stage_id: defaultStageId,
      interviewer_id: interviewerId,
      location_id: loc?.id || null,
      start_time: startTimeIso,
      end_time: endTimeIso,
      max_capacity: parseInt(s.capacity, 10) || 1,
      booked_count: parseInt(s.booked_count, 10) || 0,
      status: s.status.toLowerCase() === 'available' ? 'open' : 'booked',
      meeting_link: `Recruitment Event: ${s.event_id}`,
    });
  }

  return { slots, slotIdMap };
}

export function transformInterviewsAndWaitlists(
  rawInterviews: RawInterview[],
  candidateUuidMap: Map<string, string>,
  slotIdMap: Map<string, string>,
  stageIdMap: Map<string, string>,
  defaultStageId: string
): {
  bookings: TransformedBooking[];
  waitlists: TransformedWaitlist[];
  bookingIdMap: Map<string, string>;
} {
  const bookings: TransformedBooking[] = [];
  const waitlists: TransformedWaitlist[] = [];
  const bookingIdMap = new Map<string, string>();
  let waitlistPositionCounter = 1;

  for (const i of rawInterviews) {
    const candidateUuid = candidateUuidMap.get(i.candidate_id);
    if (!candidateUuid) {
      throw new Error(`Candidate UUID not found for ${i.candidate_id}`);
    }

    const slotUuid = slotIdMap.get(i.slot_id);
    const stageUuid = stageIdMap.get(i.job_id) || defaultStageId;
    const interviewUuid = generateDeterministicUuid(i.interview_id);

    if (i.booking_status === 'Scheduled') {
      bookingIdMap.set(i.interview_id, interviewUuid);
      bookings.push({
        id: interviewUuid,
        slot_id: slotUuid!,
        candidate_id: candidateUuid,
        status: 'confirmed',
        booked_at: combineDateTime(i.scheduled_date, i.scheduled_time),
      });
    } else if (i.booking_status === 'Cancelled') {
      bookingIdMap.set(i.interview_id, interviewUuid);
      bookings.push({
        id: interviewUuid,
        slot_id: slotUuid!,
        candidate_id: candidateUuid,
        status: 'cancelled',
        booked_at: combineDateTime(i.scheduled_date, i.scheduled_time),
        cancellation_reason: 'Candidate requested cancellation before slot',
        cancelled_at: combineDateTime(i.scheduled_date, i.scheduled_time),
      });
    } else if (i.booking_status === 'Waitlisted') {
      waitlists.push({
        id: interviewUuid,
        stage_id: stageUuid,
        candidate_id: candidateUuid,
        position: waitlistPositionCounter++,
        status: 'waiting',
      });
    }
  }

  return { bookings, waitlists, bookingIdMap };
}

export function transformAttendanceAndAbsence(
  rawAttendance: RawAttendance[],
  candidateUuidMap: Map<string, string>,
  bookingIdMap: Map<string, string>,
  hrAdminId: string
): {
  attendanceRecords: TransformedAttendance[];
  absenceCases: TransformedAbsenceCase[];
} {
  const attendanceRecords: TransformedAttendance[] = [];
  const absenceCases: TransformedAbsenceCase[] = [];

  for (const a of rawAttendance) {
    const bookingUuid = bookingIdMap.get(a.interview_id);
    const candidateUuid = candidateUuidMap.get(a.candidate_id);
    if (!bookingUuid || !candidateUuid) {
      continue; // Skips non-scheduled bookings
    }

    const attendanceUuid = generateDeterministicUuid(a.attendance_id);
    let mappedStatus: 'attended' | 'absence_excused' | 'absent_unexcused' | 'absence_requested' = 'attended';
    let checkInTime: string | null = null;

    if (a.attendance_status === 'Attended') {
      mappedStatus = 'attended';
      checkInTime = new Date().toISOString();
    } else if (a.attendance_status === 'Rescheduled') {
      // In HireSlot's workflow: Rescheduled candidates are under active reschedule review
      mappedStatus = 'absence_requested';
    } else if (a.attendance_status === 'Absent') {
      if (a.justification_status === 'Pending' || a.justification_status === 'Submitted') {
        mappedStatus = 'absence_requested';
      } else {
        mappedStatus = 'absent_unexcused';
      }
    }

    attendanceRecords.push({
      id: attendanceUuid,
      booking_id: bookingUuid,
      candidate_id: candidateUuid,
      status: mappedStatus,
      check_in_time: checkInTime,
      marked_by: hrAdminId,
      notes: `Policy Action: ${a.policy_action} | Justification: ${a.justification_status || 'N/A'}${a.absence_reason ? ' | Reason: ' + a.absence_reason : ''}`,
    });

    // Create absence case if absence reason exists
    if (a.attendance_status === 'Absent' || a.attendance_status === 'Rescheduled') {
      let mappedReason: 'medical' | 'transit_delay' | 'emergency' | 'other' = 'other';
      if (a.absence_reason.includes('Medical')) mappedReason = 'medical';
      else if (a.absence_reason.includes('Travel')) mappedReason = 'transit_delay';
      else if (a.absence_reason.includes('emergency')) mappedReason = 'emergency';

      let caseStatus: 'submitted' | 'under_review' | 'approved_reschedule' | 'rejected' = 'under_review';
      if (a.justification_status === 'Submitted') caseStatus = 'submitted';
      else if (a.justification_status === 'Rejected' || a.policy_action === 'Opportunity Lost') caseStatus = 'rejected';
      else if (a.attendance_status === 'Rescheduled') caseStatus = 'under_review';

      absenceCases.push({
        id: generateDeterministicUuid(`${a.attendance_id}:absence_case`),
        booking_id: bookingUuid,
        candidate_id: candidateUuid,
        reason_type: mappedReason,
        explanation: a.absence_reason || 'Absence recorded during technical hiring drive.',
        status: caseStatus,
      });
    }
  }

  return { attendanceRecords, absenceCases };
}
