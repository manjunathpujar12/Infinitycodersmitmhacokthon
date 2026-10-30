import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserRole } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return dateString;
  }
}

export const ROLE_LABELS: Record<UserRole, { label: string; description: string; badgeClass: string }> = {
  HR_ADMIN: {
    label: 'HR Admin',
    description: 'Full system control, ranking rules config & policy approval',
    badgeClass: 'bg-sage-100 text-sage-800 border-sage-300',
  },
  HR_RECRUITER: {
    label: 'HR Recruiter',
    description: 'Hiring drives, job roles, candidate allocations & alternative offers',
    badgeClass: 'bg-terracotta-100 text-terracotta-800 border-terracotta-300',
  },
  INTERVIEW_COORDINATOR: {
    label: 'Interview Coordinator',
    description: 'Interview slots, calendar, waitlist fast-fill recovery & check-in desk',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  FINANCE_OFFICER: {
    label: 'Finance / Payroll Reviewer',
    description: 'Candidate travel/hotel claims review, policy audits & payroll batches',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};
