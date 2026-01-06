import { DetectionEvent } from './VisionProcessor';

export interface TimeRange {
  id: string;
  start: number;
  end: number;
  type: 'keep' | 'remove';
}

export interface TimelineState {
  badSegments: TimeRange[];
  keepSegments: TimeRange[];
  totalDuration: number;
}

export class TimelineManager {
  // Threshold to group consecutive detections (1.0s covers the 0.5s sampling gap)
  private static readonly MERGE_THRESHOLD = 1.0;
  // Padding to add around the detection to ensure clean cuts
  private static readonly SAFETY_PADDING = 0.25;

  /**
   * Primary Entry Point: Converts raw vision data into actionable edit lists
   */
  public static processDetections(
    events: DetectionEvent[], 
    totalDuration: number
  ): TimelineState {
    const badSegments = this.groupDetections(events, totalDuration);
    const keepSegments = this.calculateKeepRanges(badSegments, totalDuration);

    return {
      badSegments,
      keepSegments,
      totalDuration
    };
  }

  /**
   * Groups raw point-in-time detections into continuous time ranges
   */
  private static groupDetections(
    events: DetectionEvent[], 
    duration: number
  ): TimeRange[] {
    if (events.length === 0) return [];

    // 1. Sort by timestamp to ensure chronological processing
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    
    const segments: TimeRange[] = [];
    let currentStart = sortedEvents[0].timestamp;
    let currentEnd = sortedEvents[0].timestamp;

    for (let i = 1; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const gap = event.timestamp - currentEnd;

      if (gap <= this.MERGE_THRESHOLD) {
        // Extend current segment
        currentEnd = event.timestamp;
      } else {
        // Finalize current segment and start new one
        segments.push(this.createBadSegment(currentStart, currentEnd, duration));
        currentStart = event.timestamp;
        currentEnd = event.timestamp;
      }
    }

    // Push the final segment
    segments.push(this.createBadSegment(currentStart, currentEnd, duration));

    return segments;
  }

  /**
   * Helper to format a bad segment with padding and boundary checks
   */
  private static createBadSegment(start: number, end: number, maxDuration: number): TimeRange {
    // Apply padding (start slightly earlier, end slightly later)
    const paddedStart = Math.max(0, start - this.SAFETY_PADDING);
    const paddedEnd = Math.min(maxDuration, end + this.SAFETY_PADDING);

    return {
      id: crypto.randomUUID(),
      start: paddedStart,
      end: paddedEnd,
      type: 'remove'
    };
  }

  /**
   * Inverts "Bad Ranges" to find the "Good Gameplay" to keep
   */
  private static calculateKeepRanges(
    badSegments: TimeRange[], 
    totalDuration: number
  ): TimeRange[] {
    const keepSegments: TimeRange[] = [];
    let cursor = 0;

    for (const bad of badSegments) {
      // If there is valid time between cursor and bad start, keep it
      if (bad.start > cursor) {
        keepSegments.push({
          id: crypto.randomUUID(),
          start: cursor,
          end: bad.start,
          type: 'keep'
        });
      }
      // Jump cursor over the bad segment
      cursor = Math.max(cursor, bad.end);
    }

    // Capture remaining footage after last bad segment
    if (cursor < totalDuration) {
      keepSegments.push({
        id: crypto.randomUUID(),
        start: cursor,
        end: totalDuration,
        type: 'keep'
      });
    }

    return keepSegments;
  }
}