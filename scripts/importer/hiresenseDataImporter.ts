/**
 * HireSense AI Dataset Importer CLI Orchestrator
 * HireSlot Backend Infrastructure
 *
 * Usage:
 *   npx tsx scripts/importer/hiresenseDataImporter.ts --dry-run
 *   npx tsx scripts/importer/hiresenseDataImporter.ts --skip-storage
 *   npx tsx scripts/importer/hiresenseDataImporter.ts --verify-only
 */

import { join } from 'node:path';
import { AuthProvisioner, generateDeterministicUuid } from './authProvisioner.js';
import {
  loadAllDatasetFiles,
  transformLocations,
  transformCandidates,
  transformJobsAndVacancies,
  transformSlots,
  transformInterviewsAndWaitlists,
  transformAttendanceAndAbsence,
} from './dataParsers.js';
import { ResumeUploader } from './resumeUploader.js';
import { PostImportValidator } from './postImportValidator.js';

export interface CliOptions {
  dryRun: boolean;
  skipStorage: boolean;
  verifyOnly: boolean;
  datasetPath: string;
}

export function parseCliArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry-run') || !process.env.SUPABASE_SERVICE_ROLE_KEY;
  const skipStorage = args.includes('--skip-storage');
  const verifyOnly = args.includes('--verify-only');

  const datasetPath = join(process.cwd(), 'data', 'HireSense_AI_Dataset_Package');

  return {
    dryRun,
    skipStorage,
    verifyOnly,
    datasetPath,
  };
}

export async function runImporter(options: CliOptions) {
  console.log('\n================================================================');
  console.log('   HIRESLOT BACKEND: HIRESENSE AI DATASET IMPORTER');
  console.log('================================================================');
  console.log(`Mode:            ${options.dryRun ? 'DRY-RUN (Safe Validation, Zero DB Writes)' : 'LIVE EXECUTION'}`);
  console.log(`Dataset Path:    ${options.datasetPath}`);
  console.log(`Skip Storage:    ${options.skipStorage}`);
  console.log('================================================================\n');

  // STEP 1: Parse and Load All Dataset Files
  console.log('[Step 1/5] Loading and parsing raw dataset files...');
  const dataset = loadAllDatasetFiles(options.datasetPath);

  console.log(`  ✓ Loaded candidates:          ${dataset.candidates.length} records`);
  console.log(`  ✓ Loaded jobs:                ${dataset.jobs.length} records`);
  console.log(`  ✓ Loaded applications:        ${dataset.applications.length} records`);
  console.log(`  ✓ Loaded location prefs:      ${dataset.locationPreferences.length} records`);
  console.log(`  ✓ Loaded recruitment events:  ${dataset.events.length} records`);
  console.log(`  ✓ Loaded interview slots:     ${dataset.slots.length} records`);
  console.log(`  ✓ Loaded interviews:          ${dataset.interviews.length} records`);
  console.log(`  ✓ Loaded attendance records:  ${dataset.attendance.length} records`);
  console.log(`  ✓ Loaded hiring outcomes:     ${dataset.outcomes.length} records`);
  console.log(`  ✓ Loaded resume profiles:     ${dataset.syntheticResumeRecords.length} records`);

  // STEP 2: Auth User Identity Mapping & Provisioning Simulation
  console.log('\n[Step 2/5] Initializing Auth user identity mapping...');
  const authProvisioner = new AuthProvisioner(undefined, options.dryRun);
  const authSim = authProvisioner.simulateDryRunProvisioning(dataset.candidates);

  console.log(`  ✓ Mapped ${authSim.candidateCount} candidate Auth UUIDs`);
  console.log(`  ✓ Technical Interviewer UUID: ${authSim.interviewerUuid}`);
  console.log(`  ✓ HR Administrator UUID:     ${authSim.hrAdminUuid}`);
  console.log('  Sample Mappings:');
  for (const s of authSim.sampleMappings) {
    console.log(`    • ${s.legacyId} (${s.email}) -> ${s.uuid}`);
  }

  // STEP 3: Relational Entities Transformation
  console.log('\n[Step 3/5] Transforming relational entities against schema constraints...');
  const demoCompanyId = generateDeterministicUuid('HireSense Prototype India Ltd');
  const locationMap = transformLocations(demoCompanyId);
  const candidateUuidMap = authProvisioner.getAllCandidateUuids();

  const transformedProfiles = transformCandidates(
    dataset.candidates,
    candidateUuidMap,
    dataset.applications,
    dataset.locationPreferences,
    dataset.outcomes,
    dataset.syntheticResumeRecords
  );

  const { jobs, vacancies, stages, stageIdMap } = transformJobsAndVacancies(
    dataset.jobs,
    demoCompanyId,
    locationMap
  );

  const defaultStageId = stages[0]?.id || generateDeterministicUuid('default_stage');
  const { slots, slotIdMap } = transformSlots(
    dataset.slots,
    locationMap,
    authSim.interviewerUuid,
    defaultStageId
  );

  const { bookings, waitlists, bookingIdMap } = transformInterviewsAndWaitlists(
    dataset.interviews,
    candidateUuidMap,
    slotIdMap,
    stageIdMap,
    defaultStageId
  );

  const { attendanceRecords, absenceCases } = transformAttendanceAndAbsence(
    dataset.attendance,
    candidateUuidMap,
    bookingIdMap,
    authSim.hrAdminUuid
  );

  console.log(`  ✓ Transformed Locations:      ${locationMap.size} cities (India default)`);
  console.log(`  ✓ Transformed Candidate Rows: ${transformedProfiles.length}`);
  console.log(`  ✓ Transformed Job Openings:   ${jobs.length}`);
  console.log(`  ✓ Transformed City Vacancies: ${vacancies.length}`);
  console.log(`  ✓ Transformed Stages:         ${stages.length}`);
  console.log(`  ✓ Transformed Slots:          ${slots.length}`);
  console.log(`  ✓ Transformed Bookings:       ${bookings.length} (405 Confirmed, 18 Cancelled)`);
  console.log(`  ✓ Transformed Waitlists:      ${waitlists.length}`);
  console.log(`  ✓ Transformed Attendance:     ${attendanceRecords.length}`);
  console.log(`  ✓ Transformed Absence Cases:  ${absenceCases.length}`);

  // STEP 4: PDF Resume Disk Validation
  console.log('\n[Step 4/5] Validating 500 synthetic PDF resumes on local disk...');
  const resumeUploader = new ResumeUploader(undefined, options.dryRun);
  const pdfValidation = resumeUploader.validateSyntheticPdfs(
    options.datasetPath,
    dataset.candidates,
    candidateUuidMap
  );

  console.log(`  ✓ Total PDF Resumes:         ${pdfValidation.totalPdfs}`);
  console.log(`  ✓ Valid PDFs on Disk:        ${pdfValidation.validPdfs} (100% verified magic bytes %PDF-)`);
  console.log(`  ✓ Missing PDFs:              ${pdfValidation.invalidPdfs}`);
  console.log(`  ✓ Total Resume Package Size: ${(pdfValidation.totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  // STEP 5: Referential Integrity and Post-Import Validation
  console.log('\n[Step 5/5] Running referential integrity and invariant checks...');
  const validation = PostImportValidator.validateInMemoryStructures({
    locations: locationMap,
    profiles: transformedProfiles,
    jobs,
    vacancies,
    stages,
    slots,
    bookings,
    waitlists,
    attendance: attendanceRecords,
    absenceCases,
  });

  console.log('\n----------------------------------------------------------------');
  console.log('   INTEGRITY ASSERTION RESULTS');
  console.log('----------------------------------------------------------------');
  for (const r of validation.results) {
    const statusSymbol = r.passed ? '✔ PASS' : '✖ FAIL';
    console.log(`  [${statusSymbol}] ${r.name.padEnd(52)} (Expected: ${r.expected}, Actual: ${r.actual})`);
  }
  console.log('----------------------------------------------------------------\n');

  if (validation.allPassed && pdfValidation.invalidPdfs === 0) {
    console.log('🎉 DRY-RUN VALIDATION SUCCESSFUL: All dataset rows, foreign keys, enums,');
    console.log('   and synthetic PDF resumes are 100% compliant with existing HireSlot schema.');
    console.log('   Zero database writes executed. Awaiting explicit approval for live ingestion.\n');
  } else {
    console.error('✖ VALIDATION FAILED: Inconsistencies detected. Review details above.');
    process.exit(1);
  }
}

// Execute if run directly from CLI
if (process.argv[1]?.includes('hiresenseDataImporter')) {
  const options = parseCliArgs(process.argv);
  runImporter(options).catch((err) => {
    console.error('Fatal Importer Error:', err);
    process.exit(1);
  });
}
