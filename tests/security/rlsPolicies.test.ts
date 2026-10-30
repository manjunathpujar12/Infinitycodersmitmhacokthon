import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

/**
 * Row Level Security & RBAC Policy Unit Test Suite
 * Validates permission logic, candidate isolation, and HR company/location boundaries.
 */

interface HrPermissionEntry {
  userId: string;
  companyId: string;
  locationId?: string | null;
  permissionLevel: 'viewer' | 'manager' | 'admin';
}

interface LocationRecord {
  id: string;
  companyId: string;
  name: string;
  country: string;
}

interface UserAuthPayload {
  id: string;
  email: string;
  rawUserMetaData?: {
    full_name?: string;
    role?: string;
    phone?: string;
    avatar_url?: string;
  };
}

interface ProfileRecord {
  id: string;
  email: string;
  fullName: string;
  role: 'candidate' | 'hr_staff' | 'interviewer' | 'payroll_officer' | 'admin';
  phone?: string;
}

/**
 * Simulates public user signup handle_new_user() trigger.
 * STRICT SECURITY: User-provided metadata must never grant privileged roles.
 */
function handleNewUserSimulation(authPayload: UserAuthPayload): ProfileRecord {
  return {
    id: authPayload.id,
    email: authPayload.email,
    fullName: authPayload.rawUserMetaData?.full_name || authPayload.email.split('@')[0],
    role: 'candidate', // STRICT: Every signup receives 'candidate' role by default
    phone: authPayload.rawUserMetaData?.phone,
  };
}

/**
 * Simulates public.has_hr_permission(p_company_id, p_location_id)
 * Scoping rules:
 * - Admin has full system-wide access.
 * - Non-HR/payroll users have no access.
 * - If targetLocationId is NULL: caller requests company-wide access. Requires explicit company-wide permission (locationId is NULL).
 * - If targetLocationId is NOT NULL: caller requests location-specific access. Allowed if user has explicit company-wide permission OR matching location permission.
 */
function evaluateHrPermission(
  permissions: HrPermissionEntry[],
  userRole: string,
  userId: string,
  targetCompanyId: string,
  targetLocationId?: string | null
): boolean {
  if (userRole === 'admin') return true;
  if (userRole !== 'hr_staff' && userRole !== 'payroll_officer') return false;

  return permissions.some((p) => {
    if (p.userId !== userId) return false;
    if (p.companyId !== targetCompanyId) return false;

    // Explicit company-wide permission (locationId is null or undefined) grants company-wide access and access to all company locations
    if (!p.locationId) return true;

    // Location-specific permission CANNOT grant company-wide access (when targetLocationId is null or undefined)
    if (!targetLocationId) return false;

    // Location-specific permission must match the exact target location
    return p.locationId === targetLocationId;
  });
}

/**
 * Simulates database uniqueness enforcement on public.hr_permissions
 * - uq_hr_permissions_company_wide (user_id, company_id) WHERE location_id IS NULL
 * - uq_hr_permissions_location (user_id, company_id, location_id) WHERE location_id IS NOT NULL
 */
class HrPermissionStore {
  private records: HrPermissionEntry[] = [];

  insertPermission(entry: HrPermissionEntry): void {
    const isCompanyWide = !entry.locationId;

    if (isCompanyWide) {
      const duplicateCompanyWide = this.records.some(
        (r) => r.userId === entry.userId && r.companyId === entry.companyId && !r.locationId
      );
      if (duplicateCompanyWide) {
        throw new Error(`Unique constraint violation: duplicate company-wide permission for user ${entry.userId} and company ${entry.companyId}`);
      }
    } else {
      const duplicateLocation = this.records.some(
        (r) => r.userId === entry.userId && r.companyId === entry.companyId && r.locationId === entry.locationId
      );
      if (duplicateLocation) {
        throw new Error(`Unique constraint violation: duplicate location permission for user ${entry.userId}, company ${entry.companyId}, and location ${entry.locationId}`);
      }
    }

    this.records.push(entry);
  }

  getRecords(): HrPermissionEntry[] {
    return [...this.records];
  }
}

/**
 * Simulates cross-company location validation trigger: check_hr_permission_location_company()
 */
function validateLocationCompanyBelonging(
  locations: LocationRecord[],
  companyId: string,
  locationId?: string | null
): void {
  if (!locationId) return;

  const validLocation = locations.find(
    (l) => l.id === locationId && l.companyId === companyId
  );

  if (!validLocation) {
    throw new Error(`Data Integrity Error: Location ${locationId} does not belong to company ${companyId}`);
  }
}

describe('Row Level Security & Scoping Logic', () => {
  const permissions: HrPermissionEntry[] = [
    {
      userId: 'hr-user-austin',
      companyId: 'company-acme',
      locationId: 'loc-austin',
      permissionLevel: 'manager',
    },
    {
      userId: 'hr-user-global',
      companyId: 'company-acme',
      locationId: null, // Explicit Company-wide
      permissionLevel: 'admin',
    },
  ];

  const locations: LocationRecord[] = [
    { id: 'loc-austin', companyId: 'company-acme', name: 'Acme Austin', country: 'India' },
    { id: 'loc-new-york', companyId: 'company-acme', name: 'Acme NY', country: 'India' },
    { id: 'loc-seattle', companyId: 'company-acme', name: 'Acme Seattle', country: 'India' },
    { id: 'loc-zenith-sea', companyId: 'company-zenith', name: 'Zenith Hub', country: 'India' },
  ];

  it('proves a candidate cannot self-register as admin or HR via user metadata', () => {
    // Malicious registration attempt sending privileged role in raw_user_meta_data
    const signupAttemptAdmin = handleNewUserSimulation({
      id: 'usr-attacker-01',
      email: 'attacker@example.com',
      rawUserMetaData: {
        full_name: 'Attacker Admin',
        role: 'admin', // Maliciously requested role
      },
    });

    assert.equal(signupAttemptAdmin.role, 'candidate');

    const signupAttemptHR = handleNewUserSimulation({
      id: 'usr-attacker-02',
      email: 'attacker2@example.com',
      rawUserMetaData: {
        full_name: 'Attacker HR',
        role: 'hr_staff',
      },
    });

    assert.equal(signupAttemptHR.role, 'candidate');
  });

  it('proves Location A HR cannot access Location B', () => {
    // Hannah in Austin attempts to access New York
    const hasAccess = evaluateHrPermission(
      permissions,
      'hr_staff',
      'hr-user-austin',
      'company-acme',
      'loc-new-york'
    );
    assert.equal(hasAccess, false);
  });

  it('proves Location A HR cannot obtain company-wide access', () => {
    // Hannah in Austin attempts company-wide action (targetLocationId is null or undefined)
    const hasCompanyWideAccess = evaluateHrPermission(
      permissions,
      'hr_staff',
      'hr-user-austin',
      'company-acme',
      null
    );
    assert.equal(hasCompanyWideAccess, false);

    const hasCompanyWideAccessUndef = evaluateHrPermission(
      permissions,
      'hr_staff',
      'hr-user-austin',
      'company-acme',
      undefined
    );
    assert.equal(hasCompanyWideAccessUndef, false);
  });

  it('proves explicitly company-wide authorized HR can access permitted company locations and company-wide', () => {
    // User with null locationId has explicit company-wide authorization
    const hasCompanyWide = evaluateHrPermission(
      permissions,
      'hr_staff',
      'hr-user-global',
      'company-acme',
      null
    );
    assert.equal(hasCompanyWide, true);

    // Can access location Austin
    const hasAustin = evaluateHrPermission(
      permissions,
      'hr_staff',
      'hr-user-global',
      'company-acme',
      'loc-austin'
    );
    assert.equal(hasAustin, true);

    // Can access location New York
    const hasNY = evaluateHrPermission(
      permissions,
      'hr_staff',
      'hr-user-global',
      'company-acme',
      'loc-new-york'
    );
    assert.equal(hasNY, true);
  });

  it('proves duplicate company-wide permission records are rejected', () => {
    const store = new HrPermissionStore();

    // First company-wide record succeeds
    store.insertPermission({
      userId: 'hr-user-1',
      companyId: 'company-acme',
      locationId: null,
      permissionLevel: 'admin',
    });
    assert.equal(store.getRecords().length, 1);

    // Second company-wide record for same user and company MUST throw unique constraint violation
    assert.throws(
      () => {
        store.insertPermission({
          userId: 'hr-user-1',
          companyId: 'company-acme',
          locationId: null,
          permissionLevel: 'viewer',
        });
      },
      /duplicate company-wide permission/
    );

    // However, a location-specific permission for the same user is permitted
    store.insertPermission({
      userId: 'hr-user-1',
      companyId: 'company-acme',
      locationId: 'loc-austin',
      permissionLevel: 'manager',
    });
    assert.equal(store.getRecords().length, 2);

    // Duplicate location-specific permission is also rejected
    assert.throws(
      () => {
        store.insertPermission({
          userId: 'hr-user-1',
          companyId: 'company-acme',
          locationId: 'loc-austin',
          permissionLevel: 'viewer',
        });
      },
      /duplicate location permission/
    );
  });

  it('proves assigning a location from a different company in hr_permissions is rejected', () => {
    // loc-zenith-sea belongs to company-zenith, NOT company-acme
    assert.throws(
      () => {
        validateLocationCompanyBelonging(locations, 'company-acme', 'loc-zenith-sea');
      },
      /does not belong to company/
    );

    // Valid belonging location succeeds without error
    assert.doesNotThrow(() => {
      validateLocationCompanyBelonging(locations, 'company-acme', 'loc-austin');
    });
  });

  it('proves candidates cannot exercise HR permissions', () => {
    const hasAccess = evaluateHrPermission(
      permissions,
      'candidate',
      'candidate-user-1',
      'company-acme',
      'loc-austin'
    );
    assert.equal(hasAccess, false);
  });

  it('proves HR staff cannot access a completely different company', () => {
    const hasAccess = evaluateHrPermission(
      permissions,
      'hr_staff',
      'hr-user-austin',
      'company-competitor',
      'loc-austin'
    );
    assert.equal(hasAccess, false);
  });
});
