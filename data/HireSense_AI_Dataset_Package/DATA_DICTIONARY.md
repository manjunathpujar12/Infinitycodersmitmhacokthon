# HireSense AI — Data Dictionary

All generated candidate data is synthetic. IDs are primary/foreign keys as listed.

| File | Main columns | Relationship / purpose |
|---|---|---|
| candidates | candidate_id, skills, experience_level, current_location | Candidate master table |
| jobs | job_id, job_role, required_skills, location, vacancies | Job requirement master |
| skill_taxonomy | skill_id, skill_name, occupation, skill_type | Prototype role-skill vocabulary |
| applications | application_id, candidate_id, job_id, application_status | Candidate applies to a job |
| location_preferences | preference_id, candidate_id, preferred_location, priority | One-to-many candidate location choices |
| recruitment_events | event_id, event_name, location, event_date, capacity | Hiring drive master |
| interview_slots | slot_id, event_id, location, interview_date, capacity, booked_count | Slots within an event |
| interviews | interview_id, candidate_id, job_id, event_id, slot_id, booking_status | Candidate interview booking |
| attendance | attendance_id, interview_id, candidate_id, attendance_status, policy_action | Attendance and absence policy trail |
| hiring_outcomes | outcome_id, interview_id, candidate_id, job_id, interview_result, final_status | Interview result and hiring status |
| public_resumes | public_resume_id, source_dataset, resume_text, skills | Imported only when a public file is supplied |
| synthetic_resume_records | candidate profile, summary, skills, projects | Structured content used to render synthetic PDFs |

## Important joins
- `candidates.candidate_id = applications.candidate_id`
- `jobs.job_id = applications.job_id`
- `candidates.candidate_id = location_preferences.candidate_id`
- `recruitment_events.event_id = interview_slots.event_id`
- `interview_slots.slot_id = interviews.slot_id`
- `candidates.candidate_id = interviews.candidate_id`
- `interviews.interview_id = attendance.interview_id`
- `interviews.interview_id = hiring_outcomes.interview_id`

## Policy simulation
- Fresher + Absent -> `policy_action = Opportunity Lost`
- Experienced + Absent -> `policy_action = Review Justification`
- Attended -> `policy_action = Continue Process`
- Rescheduled -> `policy_action = Reschedule Review`

These are configurable prototype rules derived from the supplied problem statement, not real company policy. Add HR review and correction for erroneous attendance records.
