/**
 * Synthetic Resume Storage Uploader
 * HireSlot Backend Infrastructure
 *
 * Validates, checks, and uploads the 500 synthetic PDF resumes into
 * Supabase Storage with rate-limiting, error handling, and private bucket isolation.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResumeValidationResult {
  totalPdfs: number;
  validPdfs: number;
  invalidPdfs: number;
  missingFiles: string[];
  totalBytes: number;
  samplePaths: Array<{ candidateId: string; storagePath: string; sizeBytes: number }>;
}

export class ResumeUploader {
  constructor(
    private supabaseAdmin?: SupabaseClient,
    private isDryRun: boolean = true
  ) {}

  /**
   * Dry-run validation of all 500 synthetic PDF resumes on local disk.
   * Zero network calls, zero storage operations.
   */
  validateSyntheticPdfs(
    baseDir: string,
    candidates: Array<{ candidate_id: string; resume_path: string }>,
    candidateUuidMap: Map<string, string>
  ): ResumeValidationResult {
    let validCount = 0;
    let invalidCount = 0;
    let totalBytes = 0;
    const missing: string[] = [];
    const samplePaths: Array<{ candidateId: string; storagePath: string; sizeBytes: number }> = [];

    for (const c of candidates) {
      const fullPath = join(baseDir, c.resume_path);

      if (!existsSync(fullPath)) {
        missing.push(c.resume_path);
        invalidCount++;
        continue;
      }

      const buffer = readFileSync(fullPath);
      // Validate PDF magic bytes (%PDF-)
      const isPdfHeader = buffer.subarray(0, 5).toString('ascii') === '%PDF-';

      if (buffer.length > 0 && isPdfHeader) {
        validCount++;
        totalBytes += buffer.length;

        const authUuid = candidateUuidMap.get(c.candidate_id) || 'dry-run-uuid';
        const targetPath = `resumes/${authUuid}/resume.pdf`;

        if (samplePaths.length < 5) {
          samplePaths.push({
            candidateId: c.candidate_id,
            storagePath: targetPath,
            sizeBytes: buffer.length,
          });
        }
      } else {
        invalidCount++;
        missing.push(`${c.resume_path} (Corrupt Header)`);
      }
    }

    return {
      totalPdfs: candidates.length,
      validPdfs: validCount,
      invalidPdfs: invalidCount,
      missingFiles: missing,
      totalBytes,
      samplePaths,
    };
  }

  /**
   * Live execution: uploads PDF resumes to private 'resumes' bucket
   * ONLY invoked when dryRun === false and explicitly authorized.
   */
  async uploadAllResumes(
    baseDir: string,
    candidates: Array<{ candidate_id: string; resume_path: string }>,
    candidateUuidMap: Map<string, string>,
    concurrency = 5
  ): Promise<{ uploaded: number; failed: number; errors: string[] }> {
    if (this.isDryRun || !this.supabaseAdmin) {
      throw new Error('Safety Guard: Cannot execute live storage uploads in dry-run mode.');
    }

    let uploaded = 0;
    let failed = 0;
    const errors: string[] = [];

    // Chunk uploads to control network concurrency
    for (let i = 0; i < candidates.length; i += concurrency) {
      const batch = candidates.slice(i, i + concurrency);

      await Promise.all(
        batch.map(async (c) => {
          try {
            const authUuid = candidateUuidMap.get(c.candidate_id);
            if (!authUuid) {
              throw new Error(`Missing Auth UUID for candidate ${c.candidate_id}`);
            }

            const localPath = join(baseDir, c.resume_path);
            const buffer = readFileSync(localPath);
            const destinationPath = `${authUuid}/resume.pdf`;

            const { error } = await this.supabaseAdmin!.storage
              .from('resumes')
              .upload(destinationPath, buffer, {
                contentType: 'application/pdf',
                upsert: true,
              });

            if (error) {
              failed++;
              errors.push(`Upload failed for ${c.candidate_id}: ${error.message}`);
            } else {
              uploaded++;
            }
          } catch (err: unknown) {
            failed++;
            errors.push(`Upload error for ${c.candidate_id}: ${(err as Error).message}`);
          }
        })
      );
    }

    return { uploaded, failed, errors };
  }
}
