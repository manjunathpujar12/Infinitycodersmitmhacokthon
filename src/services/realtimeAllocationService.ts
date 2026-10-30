import { supabase, isRealSupabaseConfigured } from '../lib/supabaseClient';
import { CandidateAllocation } from '../types/allocation';
import { RealtimeChannel } from '@supabase/supabase-js';

type AllocationUpdateHandler = (allocation: CandidateAllocation) => void;

/**
 * Realtime Allocation Service
 * Manages Supabase Realtime subscriptions to the shared candidate_allocations table.
 * Supports:
 * - Candidate-filtered subscription (filter: candidate_id=eq.${candidateId})
 * - HR-wide subscription (all candidate allocations)
 * - Local fallback event bus for synchronized multi-portal live updates
 */
class RealtimeAllocationService {
  private candidateSubscribers: Map<string, Set<AllocationUpdateHandler>> = new Map();
  private hrSubscribers: Set<AllocationUpdateHandler> = new Set();
  private activeSupabaseChannels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribes to real-time allocation updates strictly filtered to the authenticated candidate.
   * Uses Supabase Realtime filtered channel: candidate_id=eq.${candidateId}
   *
   * @param candidateId The authenticated candidate's unique UUID/ID
   * @param callback Handler called whenever an allocation record updates
   * @returns Unsubscribe function
   */
  public subscribeToCandidateAllocation(
    candidateId: string,
    callback: AllocationUpdateHandler
  ): () => void {
    // 1. Register in memory bus
    if (!this.candidateSubscribers.has(candidateId)) {
      this.candidateSubscribers.set(candidateId, new Set());
    }
    this.candidateSubscribers.get(candidateId)!.add(callback);

    // 2. Connect Supabase Realtime channel if configured
    const channelName = `candidate_allocations:candidate_id=eq.${candidateId}`;
    if (isRealSupabaseConfigured && !this.activeSupabaseChannels.has(channelName)) {
      try {
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'candidate_allocations',
              filter: `candidate_id=eq.${candidateId}`,
            },
            (payload) => {
              if (payload.new) {
                const updated = payload.new as CandidateAllocation;
                this.notifyCandidateSubscribers(candidateId, updated);
                this.notifyHrSubscribers(updated);
              }
            }
          )
          .subscribe();

        this.activeSupabaseChannels.set(channelName, channel);
      } catch (err) {
        console.warn('Realtime subscription initialization error (falling back to bus):', err);
      }
    }

    // Return cleanup function
    return () => {
      const subs = this.candidateSubscribers.get(candidateId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.candidateSubscribers.delete(candidateId);
          const channel = this.activeSupabaseChannels.get(channelName);
          if (channel) {
            channel.unsubscribe();
            this.activeSupabaseChannels.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Subscribes HR Dashboard (Member 3) to all candidate allocation changes
   *
   * @param callback Handler called whenever any allocation changes
   * @returns Unsubscribe function
   */
  public subscribeToHrAllocations(callback: AllocationUpdateHandler): () => void {
    this.hrSubscribers.add(callback);

    const channelName = 'candidate_allocations:hr_all';
    if (isRealSupabaseConfigured && !this.activeSupabaseChannels.has(channelName)) {
      try {
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'candidate_allocations',
            },
            (payload) => {
              if (payload.new) {
                const updated = payload.new as CandidateAllocation;
                this.notifyHrSubscribers(updated);
                if (updated.candidateId) {
                  this.notifyCandidateSubscribers(updated.candidateId, updated);
                }
              }
            }
          )
          .subscribe();

        this.activeSupabaseChannels.set(channelName, channel);
      } catch (err) {
        console.warn('HR Realtime subscription initialization error:', err);
      }
    }

    return () => {
      this.hrSubscribers.delete(callback);
      if (this.hrSubscribers.size === 0) {
        const channel = this.activeSupabaseChannels.get(channelName);
        if (channel) {
          channel.unsubscribe();
          this.activeSupabaseChannels.delete(channelName);
        }
      }
    };
  }

  /**
   * Broadcasts an allocation update to both candidate and HR portal subscribers
   */
  public publishAllocationUpdate(allocation: CandidateAllocation): void {
    if (allocation.candidateId) {
      this.notifyCandidateSubscribers(allocation.candidateId, allocation);
    }
    this.notifyHrSubscribers(allocation);
  }

  private notifyCandidateSubscribers(candidateId: string, allocation: CandidateAllocation) {
    const subs = this.candidateSubscribers.get(candidateId);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(allocation);
        } catch (e) {
          console.error('Error in candidate subscriber callback:', e);
        }
      });
    }
  }

  private notifyHrSubscribers(allocation: CandidateAllocation) {
    this.hrSubscribers.forEach((cb) => {
      try {
        cb(allocation);
      } catch (e) {
        console.error('Error in HR subscriber callback:', e);
      }
    });
  }
}

export const realtimeAllocationService = new RealtimeAllocationService();

