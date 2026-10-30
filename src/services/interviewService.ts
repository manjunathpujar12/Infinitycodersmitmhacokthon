import { InterviewSlot, InterviewBookingRequest, InterviewStage } from '../types/interview';

/**
 * Dedicated service for managing candidate interviews.
 * Architectural Boundary:
 * - Completely decoupled from Job Location Allocation engine.
 * - Interview scores and notes are purely evaluative records.
 * - Under NO circumstances does this service or AI scores automatically disqualify or reject allocations.
 */
class InterviewService {
  private slots: InterviewSlot[] = [];

  constructor() {
    this.seedInitialSlots();
  }

  private seedInitialSlots() {
    const today = new Date();
    const d1 = new Date(today.getTime() + 24 * 3600 * 1000).toISOString();
    const d2 = new Date(today.getTime() + 48 * 3600 * 1000).toISOString();

    this.slots = [
      {
        id: 'slot-101',
        interviewerId: 'int-01',
        interviewerName: 'Sarah Jenkins (Principal Architect)',
        candidateId: 'cand-01',
        candidateName: 'Aditi Sharma',
        jobId: 'job-01',
        stage: 'ROUND_2_SYSTEM_DESIGN',
        startTime: d1,
        endTime: new Date(new Date(d1).getTime() + 3600 * 1000).toISOString(),
        status: 'SCHEDULED',
        meetingLink: 'https://meet.hireslot.internal/room-101',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
      {
        id: 'slot-102',
        interviewerId: 'int-02',
        interviewerName: 'David Chen (Director of Eng)',
        candidateId: 'cand-02',
        candidateName: 'Rohan Verma',
        jobId: 'job-01',
        stage: 'FINAL_EXECUTIVE',
        startTime: d2,
        endTime: new Date(new Date(d2).getTime() + 3600 * 1000).toISOString(),
        status: 'SCHEDULED',
        meetingLink: 'https://meet.hireslot.internal/room-102',
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
    ];
  }

  public getCandidateInterviews(candidateId: string): InterviewSlot[] {
    return this.slots.filter((s) => s.candidateId === candidateId);
  }

  public getJobInterviews(jobId: string): InterviewSlot[] {
    return this.slots.filter((s) => s.jobId === jobId);
  }

  public bookInterviewSlot(req: InterviewBookingRequest, interviewerId: string, interviewerName: string): InterviewSlot {
    const start = new Date(req.preferredDate).toISOString();
    const end = new Date(new Date(start).getTime() + 3600 * 1000).toISOString();

    const newSlot: InterviewSlot = {
      id: `slot-${Date.now()}`,
      interviewerId,
      interviewerName,
      candidateId: req.candidateId,
      jobId: req.jobId,
      stage: req.stage,
      startTime: start,
      endTime: end,
      status: 'SCHEDULED',
      meetingLink: `https://meet.hireslot.internal/${Math.random().toString(36).substring(7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.slots.push(newSlot);
    return newSlot;
  }

  public recordFeedback(slotId: string, notes: string, score?: number): InterviewSlot {
    const slot = this.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error(`Interview slot ${slotId} not found`);

    slot.feedbackNotes = notes;
    if (score !== undefined) {
      // Clamped score recorded as reference notes only; does NOT trigger allocation rejection
      slot.score = Math.min(100, Math.max(0, score));
    }
    slot.status = 'COMPLETED';
    slot.updatedAt = new Date().toISOString();
    return slot;
  }
}

export const interviewService = new InterviewService();

