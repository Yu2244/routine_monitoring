import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import './AlertScreen.css'; // Import the CSS file
// Import helpers from the new utility file
import { checkAlertCondition, getRelevantValue } from '../utils/alertUtils';


// Receive dismissedAlerts and dismissAlert from props
function AlertScreen({ history, checklist, graphData, dismissedAlerts, dismissAlert }) {
  console.log("AlertScreen received props:", { history, checklist, graphData, dismissedAlerts }); // DEBUG LOG

  // Calculate active alerts based on the latest data points and configurations, filtering out dismissed ones
  const currentAlerts = useMemo(() => {
      if (!checklist || !checklist.questions || !history || history.length === 0 || !graphData) {
          return [];
      }
      const alerts = [];
      checklist.questions.forEach(q => {
          if (
              q.graphConfig?.enabled &&
              q.graphConfig.thresholdValue !== undefined &&
              q.graphConfig.alertCondition !== undefined &&
              (q.type !== 'multiple_choice' || q.graphConfig.thresholdOption !== undefined)
          ) {
              const questionData = graphData[q.id];
              if (questionData && questionData.length > 0) {
                  const latestDataPoint = questionData[questionData.length - 1];
                  const currentValue = getRelevantValue(latestDataPoint, q);
                  const threshold = q.graphConfig.thresholdValue;
                  const condition = q.graphConfig.alertCondition;
                  const alertId = `${q.id}-${latestDataPoint.date}`; // Generate potential alert ID

                  // Check if condition met AND not already dismissed
                  if (checkAlertCondition(currentValue, threshold, condition) && !(dismissedAlerts || []).includes(alertId)) { // Ensure dismissedAlerts is an array
                      const graphName = `${q.graphConfig.customName} (${q.text})`;
                      let conditionText = `閾値 (${threshold}`;
                      if (q.type === 'multiple_choice') conditionText += ` / ${q.graphConfig.thresholdOption}`;
                      if (q.type === 'yes_no' || q.type === 'multiple_choice') conditionText += '%';
                      conditionText += `) を ${condition === 'above' ? '超えました' : '下回りました'}`;

                      alerts.push({
                          id: alertId,
                          questionId: q.id, // Keep questionId to look up type later
                          graphName: graphName,
                          conditionText: conditionText,
                          actualValue: currentValue,
                          date: latestDataPoint.date,
                      });
                  }
              }
          }
      });
      console.log("Calculated currentAlerts:", alerts); // DEBUG LOG
      return alerts;
  }, [checklist, history, graphData, dismissedAlerts]); // Recalculate when data or dismissed list changes


  return (
    <div className="screen-container alert-screen">
      <h2 className="screen-title">アラート</h2>

      {currentAlerts.length === 0 ? (
        <p>現在、アクティブなアラートはありません。</p>
      ) : (
        <ul className="alert-list">
          {currentAlerts.map((alert) => {
            // Find the question type again for display purposes
            const question = checklist?.questions.find(q => q.id === alert.questionId);
            const isRate = question?.type === 'yes_no' || question?.type === 'multiple_choice';
            return (
              <li key={alert.id} className="alert-item">
                <div className="alert-details">
                  <strong>グラフ名:</strong> {alert.graphName}<br />
                  <strong>条件:</strong> {alert.conditionText}<br />
                  <strong>現在の値:</strong> {alert.actualValue?.toFixed(1)} {isRate ? '%' : ''}<br /> {/* Add % sign based on looked up type */}
                  <strong>発生日 (計算上の日付):</strong> {alert.date}
                </div>
                {/* Call the dismissAlert prop function passed from App.jsx */}
                <button onClick={() => dismissAlert(alert.id)} className="dismiss-button">
                  削除 (非表示)
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default AlertScreen;

// Removed inline style injection
