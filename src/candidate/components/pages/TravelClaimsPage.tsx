import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { ExpenseCategory, TravelClaim } from '../../types';
import { Badge } from '../common/Badge';
import { Plane, Receipt, Plus, CheckCircle2, Clock, FileText, AlertCircle, Upload } from 'lucide-react';

export const TravelClaimsPage: React.FC = () => {
  const { travelClaims, submitTravelClaim, candidate } = useCandidateAuth();

  const [category, setCategory] = useState<ExpenseCategory>('TRAIN_TRAVEL');
  const [claimAmount, setClaimAmount] = useState<number>(3200);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptFileName, setReceiptFileName] = useState('Train_E-Ticket_Boarding.pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitTravelClaim({
      driveId: candidate.driveId,
      category,
      claimAmount,
      currency: 'INR',
      invoiceDate,
      receiptFileName,
      policyLimitNotes: 'Submitted for HR audit check'
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Interview Travel Support Claims
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Submit reimbursement claims for travel, trains, flights, and local transit incurred for your interview rounds
        </p>
      </div>

      {/* Policy Limits Callout */}
      <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-borderMuted grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-textMuted block">Train Travel Limit</span>
          <span className="font-extrabold text-textPrimary mt-0.5 block">2AC / Executive Chair Car</span>
          <span className="text-[11px] text-textMuted">Fully covered with ticket upload</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-textMuted block">Local Cab Cap</span>
          <span className="font-extrabold text-textPrimary mt-0.5 block">Up to ₹2,500 / Day</span>
          <span className="text-[11px] text-textMuted">Between station/airport & center</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-textMuted block">Long Haul Flight (&gt;500km)</span>
          <span className="font-extrabold text-textPrimary mt-0.5 block">Economy Airfare</span>
          <span className="text-[11px] text-textMuted">Eligible for inter-state distances</span>
        </div>
      </div>

      {/* New Claim Submission Card */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" /> New Travel Expense Submission
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Expense Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
              >
                <option value="TRAIN_TRAVEL">Train Travel (2AC / 3AC)</option>
                <option value="AIR_TRAVEL">Flight (Economy)</option>
                <option value="LOCAL_CAB">Local Rideshare / Cab</option>
                <option value="HOTEL_LODGING">Hotel Lodging</option>
                <option value="MEALS_PER_DIEM">Meals / Daily Per-Diem</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Invoice / Travel Date
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-medium text-textPrimary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Total Amount Claimed (₹)
              </label>
              <input
                type="number"
                step="50"
                min="100"
                required
                value={claimAmount}
                onChange={(e) => setClaimAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-extrabold font-mono text-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
              Receipt / Boarding Pass File Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={receiptFileName}
                onChange={(e) => setReceiptFileName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-mono text-textPrimary focus:outline-none"
              />
              <span className="px-3.5 py-2.5 bg-sidebar rounded-xl border border-borderMuted text-xs font-semibold text-textMuted flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> PDF / JPG Attached
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> Submit Reimbursement Claim
            </button>
          </div>
        </form>
      </div>

      {/* Submitted Claims History Table */}
      <div className="bg-cards rounded-2xl border border-borderMuted shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-borderMuted bg-[#FAF9F5]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-textPrimary">
            Submitted Claims History ({travelClaims.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] text-textMuted uppercase text-[10px] tracking-wider border-b border-borderMuted">
              <tr>
                <th className="py-3 px-4">Claim ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Claimed Amount</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderMuted">
              {travelClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-textPrimary">{claim.id}</td>
                  <td className="py-3 px-4 font-semibold text-textPrimary">
                    {claim.category.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 text-textMuted font-mono">{claim.invoiceDate}</td>
                  <td className="py-3 px-4 font-bold font-mono text-primary text-sm">
                    ₹{claim.claimAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-textMuted flex items-center gap-1.5 font-medium">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span className="truncate max-w-[160px]">{claim.receiptFileName}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        claim.status === 'HR_APPROVED' || claim.status === 'SENT_TO_PAYROLL'
                          ? 'success'
                          : claim.status === 'REJECTED'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {claim.status.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

