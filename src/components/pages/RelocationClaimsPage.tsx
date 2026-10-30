import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { RelocationClaim } from '../../types';
import { Badge } from '../common/Badge';
import {
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  ArrowRight,
  Receipt
} from 'lucide-react';

export const RelocationClaimsPage: React.FC = () => {
  const { relocationClaim, submitRelocationClaim, candidate } = useCandidateAuth();

  const [fromCity, setFromCity] = useState(candidate.currentCity || 'Chennai');
  const [toCity, setToCity] = useState(candidate.allocatedCity || 'Bangalore');
  const [grantAmount, setGrantAmount] = useState<number>(75000);
  const [bankAccount, setBankAccount] = useState('•••• •••• 4491');
  const [bankIfsc, setBankIfsc] = useState('HDFC0001824');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitRelocationClaim({
      driveId: candidate.driveId,
      relocationFromCity: fromCity,
      relocationToCity: toCity,
      grantAmount,
      currency: 'INR',
      bankAccountMasked: bankAccount,
      bankIfsc
    });
    setIsSubmitting(false);
  };

  const stages = [
    { label: 'Claim Submitted', status: 'done' },
    {
      label: 'HR Mobility Verified',
      status: relocationClaim && relocationClaim.status !== 'SUBMITTED' ? 'done' : 'current'
    },
    {
      label: 'Queued for Payroll Batch',
      status:
        relocationClaim && (relocationClaim.status === 'QUEUED_FOR_PAYROLL' || relocationClaim.status === 'DISBURSED')
          ? 'done'
          : 'upcoming'
    },
    {
      label: 'ACH / NEFT Disbursed',
      status: relocationClaim && relocationClaim.status === 'DISBURSED' ? 'done' : 'upcoming'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Employee Relocation Grant & Payment Tracking
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Submit official relocation allowance requests and track corporate payroll ACH/NEFT disbursement
        </p>
      </div>

      {/* Payment Tracking Card */}
      {relocationClaim && (
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono text-textMuted uppercase block">
                Disbursement Reference: {relocationClaim.id}
              </span>
              <h3 className="text-base font-bold text-textPrimary flex items-center gap-2">
                <span>Relocation Grant: ₹{relocationClaim.grantAmount.toLocaleString()}</span>
                <Badge variant="sage" size="sm">
                  {relocationClaim.status.replace(/_/g, ' ')}
                </Badge>
              </h3>
            </div>

            <div className="text-left sm:text-right font-mono text-xs">
              <span className="text-textMuted block text-[10px]">Beneficiary Bank Account</span>
              <span className="font-bold text-textPrimary">{relocationClaim.bankAccountMasked}</span>
              <span className="text-[11px] text-textMuted block">IFSC: {relocationClaim.bankIfsc}</span>
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stages.map((stage, idx) => (
              <div
                key={stage.label}
                className={`p-4 rounded-xl border space-y-1 ${
                  stage.status === 'done'
                    ? 'bg-primary-light/50 border-primary/40'
                    : stage.status === 'current'
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-[#FAF9F5] border-borderMuted opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-textMuted">Stage 0{idx + 1}</span>
                  {stage.status === 'done' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  {stage.status === 'current' && <Clock className="w-4 h-4 text-amber-600 animate-spin" />}
                </div>
                <span className="text-xs font-bold text-textPrimary block">{stage.label}</span>
              </div>
            ))}
          </div>

          {/* Transaction Ref Details */}
          <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-borderMuted flex items-center justify-between text-xs">
            <span className="text-textMuted">
              Route: <b>{relocationClaim.relocationFromCity}</b> to <b>{relocationClaim.relocationToCity}</b>
            </span>
            <span className="font-mono text-textMuted">
              Tx Ref: <b className="text-primary">{relocationClaim.transactionRefId || 'Pending Bank Batch Run'}</b>
            </span>
          </div>
        </div>
      )}

      {/* Relocation Claim Form */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-5">
        <div>
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Submit Relocation Reimbursement Request
          </h3>
          <p className="text-xs text-textMuted mt-0.5">
            Inter-city transit grant applicable upon accepting employment or allocation in a new office hub
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Relocation From City
              </label>
              <input
                type="text"
                required
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Relocation To City (Destination Hub)
              </label>
              <input
                type="text"
                required
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Eligible Lump-Sum Allowance (₹)
              </label>
              <input
                type="number"
                step="5000"
                required
                value={grantAmount}
                onChange={(e) => setGrantAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-mono font-bold text-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Bank Account Number
              </label>
              <input
                type="text"
                required
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-mono font-medium text-textPrimary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Bank IFSC Code
              </label>
              <input
                type="text"
                required
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-mono font-bold text-textPrimary uppercase focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2 disabled:opacity-60"
            >
              <Send className="w-4 h-4" /> Submit for Payroll Processing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

