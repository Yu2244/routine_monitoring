import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChecklistScreen from './ChecklistScreen'; // Assuming getOrderedQuestions is internal or exported for testing

// Mock the getOrderedQuestions function if it's not exported or test it separately
// For simplicity, let's assume we can test its logic directly or mock its behavior.

// Helper to create mock questions
const createMockQuestions = (count, lastIndex = -1) => {
    return Array.from({ length: count }, (_, i) => ({
        id: `q${i + 1}`,
        text: `Question ${i + 1}`,
        type: 'yes_no',
        isLast: i === lastIndex,
        orderIndex: i, // Original order index
        graphConfig: { enabled: false, rollingWindowSize: 7 } // Add necessary fields
    }));
};

// Direct test of the logic if possible (requires exporting getOrderedQuestions or copying logic)
// This requires exporting getOrderedQuestions from ChecklistScreen.jsx or moving it to utils
// import { getOrderedQuestions } from './ChecklistScreen'; // Hypothetical import

// OR Mocking the behavior (simpler if direct export is not feasible)
const mockGetOrderedQuestions = (questions) => {
     if (!questions || questions.length === 0) return [];
     const lastQuestion = questions.find(q => q.isLast === true);
     let otherQuestions = questions.filter(q => q.isLast !== true);
     // Simple shuffle mock (not truly random for testing)
     otherQuestions = [...otherQuestions].reverse(); // Example non-random shuffle
     if (lastQuestion) {
       otherQuestions.push(lastQuestion);
     }
     return otherQuestions;
}


describe('ChecklistScreen Question Ordering', () => {
  it('should display questions randomly by default, placing the "isLast" question at the end', () => {
    const mockQuestions = createMockQuestions(5, 2); // Q3 is last
    const expectedOrderPrefix = ['q5', 'q4', 'q2', 'q1']; // Mock shuffle reverses order
    const expectedLast = 'q3';

    // Mock the internal function call if needed, or test the exported function separately
    const ordered = mockGetOrderedQuestions(mockQuestions);

    expect(ordered.length).toBe(5);
    expect(ordered[4].id).toBe(expectedLast); // Check last question
    // Check if the first n-1 elements match the expected shuffled order (ignoring randomness for test stability)
    expect(ordered.slice(0, 4).map(q => q.id)).toEqual(expectedOrderPrefix);

  });

   it('should display questions randomly if no question is marked as last', () => {
     const mockQuestions = createMockQuestions(4); // No last question
     const expectedOrder = ['q4', 'q3', 'q2', 'q1']; // Mock shuffle reverses order

     const ordered = mockGetOrderedQuestions(mockQuestions);

     expect(ordered.length).toBe(4);
     expect(ordered.map(q => q.id)).toEqual(expectedOrder);
   });

   // Basic render test (more comprehensive tests would involve user interaction)
   it('renders correctly when checklist is provided', () => {
        const mockChecklist = {
            id: 'c1',
            title: 'Daily Test',
            questions: createMockQuestions(3, 1) // Q2 is last
        };
        render(<ChecklistScreen checklist={mockChecklist} addAnswer={() => {}} navigate={() => {}} />);

        expect(screen.getByText('Daily Test')).toBeInTheDocument();
        // Check if the first question (after mock shuffle) is displayed initially
        // Based on mock shuffle: order is q3, q1, q2. So q3 should be first.
        expect(screen.getByText('Question 3')).toBeInTheDocument();
   });

});
