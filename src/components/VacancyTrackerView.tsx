import React from 'react';
import { MapPin, Users, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { CityVacancy } from '../types/location';
import { summarizeCityVacancies } from '../engine/vacancyTracker';

interface VacancyTrackerViewProps {
  vacancies: CityVacancy[];
  jobTitle: string;
}

export const VacancyTrackerView: React.FC<VacancyTrackerViewProps> = ({
  vacancies,
  jobTitle,
}) => {
  const summary = summarizeCityVacancies('current-job', vacancies);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Capacity
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {summary.totalCapacity}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              across {vacancies.length} hubs
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Allocated Seats
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-indigo-600">
              {summary.totalAllocated}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              {summary.utilizationPercentage}% filled
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Available Vacancies
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-600">
              {summary.totalAvailable}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              seats remaining
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            City Availability
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-800">
              {summary.openCitiesCount} / {vacancies.length}
            </span>
            <span className="text-xs font-semibold text-amber-600">
              {summary.fullCitiesCount} Full
            </span>
          </div>
        </div>
      </div>

      {/* City-Wise Vacancy Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              City Vacancy Capacity Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Real-time transactional tracking for <span className="font-semibold text-indigo-600">{jobTitle}</span>
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span> Available
            </span>
            <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span> Limited (&le;20%)
            </span>
            <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span> Full (0 seats)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
          {vacancies.map((v) => {
            const fillRatio = Math.round(
              ((v.allocatedCount + v.reservedCount) / v.totalCapacity) * 100
            );
            const isFull = v.availableCapacity <= 0 || v.status === 'FULL';
            const isLimited = !isFull && v.status === 'LIMITED';

            return (
              <div
                key={v.id}
                className={`p-5 rounded-xl border transition-all ${
                  isFull
                    ? 'border-rose-200 bg-rose-50/30'
                    : isLimited
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${
                      isFull ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{v.cityName}</h4>
                      <p className="text-[11px] text-slate-500">
                        {v.coordinates.latitude.toFixed(2)}° N, {v.coordinates.longitude.toFixed(2)}° E
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      isFull
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : isLimited
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>

                {/* Numbers breakdown */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center py-2 px-1 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
                    <p className="text-sm font-bold text-slate-800">{v.totalCapacity}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Allocated</span>
                    <p className="text-sm font-bold text-indigo-600">{v.allocatedCount}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Open</span>
                    <p className={`text-sm font-bold ${isFull ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {v.availableCapacity}
                    </p>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
                    <span>Capacity Filled</span>
                    <span>{fillRatio}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isFull
                          ? 'bg-rose-500'
                          : isLimited
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, fillRatio)}%` }}
                    />
                  </div>
                </div>

                {v.reservedCount > 0 && (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    Reserved hold: {v.reservedCount} pending offer
                  </p>
                )}

                {isFull && (
                  <div className="mt-3 flex items-center space-x-1.5 text-xs text-rose-700 font-medium">
                    <Ban className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Never allocate: City is full</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

