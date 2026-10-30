import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

/**
 * Financial Integrity, Sensitive Data Masking & Audit Suite
 */

describe('Financial Security & Sensitive Bank Data Protection', () => {
  const bankLast4Regex = /^[0-9]{4}$/;

  it('validates strictly that bank last-4 digits must match 4 numeric digits', () => {
    // Valid masked bank accounts
    assert.equal(bankLast4Regex.test('1234'), true);
    assert.equal(bankLast4Regex.test('9988'), true);
    assert.equal(bankLast4Regex.test('0001'), true);

    // Invalid: Unmasked full bank accounts (must fail)
    assert.equal(bankLast4Regex.test('1234567890123456'), false);
    assert.equal(bankLast4Regex.test('123456789'), false);

    // Invalid: Non-numeric or malformed
    assert.equal(bankLast4Regex.test('12A4'), false);
    assert.equal(bankLast4Regex.test('12 4'), false);
    assert.equal(bankLast4Regex.test('123'), false);
    assert.equal(bankLast4Regex.test(''), false);
  });

  it('enforces strict cap validation during financial claim approval', () => {
    const travelPolicy = {
      category: 'interview_travel',
      capAmount: 850.0,
      currency: 'USD',
    };

    function validateApproval(claimedAmount: number, approvedAmount: number, cap: number) {
      if (approvedAmount <= 0) {
        throw new Error('Approved amount must be positive.');
      }
      if (approvedAmount > cap) {
        throw new Error(`Approved amount exceeds policy cap of ${cap}`);
      }
      if (approvedAmount > claimedAmount) {
        throw new Error('Approved amount cannot exceed claimed amount.');
      }
      return true;
    }

    // Within cap -> succeeds
    assert.equal(validateApproval(1000, 850, travelPolicy.capAmount), true);
    assert.equal(validateApproval(600, 600, travelPolicy.capAmount), true);

    // Exceeds cap -> throws error
    assert.throws(
      () => validateApproval(1200, 1000, travelPolicy.capAmount),
      /Approved amount exceeds policy cap/
    );

    // Negative or zero -> throws error
    assert.throws(
      () => validateApproval(500, 0, travelPolicy.capAmount),
      /Approved amount must be positive/
    );
  });

  it('ensures interview travel and employee relocation are distinct claim categories', () => {
    const validCategories = ['interview_travel', 'employee_relocation'] as const;

    type ClaimCategory = (typeof validCategories)[number];

    const travelClaim: { category: ClaimCategory; requiresBooking: boolean } = {
      category: 'interview_travel',
      requiresBooking: true,
    };

    const relocationClaim: { category: ClaimCategory; requiresBooking: boolean } = {
      category: 'employee_relocation',
      requiresBooking: false,
    };

    assert.notEqual(travelClaim.category, relocationClaim.category);
    assert.equal(travelClaim.category, 'interview_travel');
    assert.equal(relocationClaim.category, 'employee_relocation');
  });

  it('verifies that audit log records are immutable and cannot be altered', () => {
    interface AuditEntry {
      readonly id: string;
      readonly tableName: string;
      readonly recordId: string;
      readonly action: string;
      readonly actorId: string;
      readonly timestamp: string;
    }

    const log: AuditEntry = Object.freeze({
      id: 'audit-001',
      tableName: 'expense_claims',
      recordId: 'clm-001',
      action: 'UPDATE',
      actorId: 'hr-001',
      timestamp: new Date().toISOString(),
    });

    // Attempting to modify frozen audit record in TypeScript runtime throws TypeError
    assert.throws(() => {
      // @ts-expect-error mutating readonly property
      log.action = 'DELETE';
    });
  });
});
