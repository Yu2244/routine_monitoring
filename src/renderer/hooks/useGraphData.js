import { useMemo } from 'react';
import {
    isGraphableType,
    calculateYesNoRollingAnswerAverage,
    calculateMultipleChoiceRollingAnswerAverage,
    prepareNumberData
} from '../utils/graphUtils'; // Import helpers

// Custom hook for calculating graph data
export function useGraphData(checklist, history) {
  const today = useMemo(() => new Date(), []); // Memoize today for consistency

  const graphData = useMemo(() => {
    if (!history || history.length === 0 || !checklist || !checklist.questions) return {};

    const data = {};
    checklist.questions.forEach(q => {
      // Only calculate if the question is graphable and enabled in its config
      if (isGraphableType(q.type) && q.graphConfig?.enabled) {
        const windowSize = q.graphConfig?.rollingWindowSize || 7; // Get window size or default to 7
        try {
          if (q.type === 'yes_no') {
            data[q.id] = calculateYesNoRollingAnswerAverage(history, q.id, windowSize); // Pass windowSize
          } else if (q.type === 'multiple_choice') {
            data[q.id] = calculateMultipleChoiceRollingAnswerAverage(history, q.id, q.options, windowSize); // Pass windowSize
          } else if (q.type === 'number') {
            // Number graph still uses time period, not windowSize
            // Using a fixed 30-day period for number graphs in this hook context
            // If GraphScreen needs variable periods, that logic stays there or is passed in.
            data[q.id] = prepareNumberData(history, q.id, today, 30);
          }
        } catch (error) {
          console.error(`Error processing graph data for question ${q.id} (${q.text}):`, error);
          data[q.id] = []; // Assign empty array on error
        }
      } else {
        // Ensure key exists even if not graphed/enabled, simplifies checks later
        data[q.id] = [];
      }
    });
    return data;
  }, [history, checklist, today]); // Dependencies for recalculation

  return graphData;
}
