// Helper functions related to alert calculation

export const checkAlertCondition = (value, threshold, condition) => {
  if (value === undefined || threshold === undefined || condition === undefined) {
    return false;
  }
  if (condition === 'above') {
    return value > threshold;
  }
  if (condition === 'below') {
    return value < threshold;
  }
  return false;
};

export const getRelevantValue = (dataPoint, question) => {
    if (!dataPoint || !question) return undefined;
    switch (question.type) {
        case 'yes_no':
            return dataPoint.yesRate;
        case 'multiple_choice':
            // Use the value for the specific option targeted by the threshold
            return dataPoint[question.graphConfig?.thresholdOption]; // Added safe navigation
        case 'number':
            return dataPoint.value;
        default:
            return undefined;
    }
};
