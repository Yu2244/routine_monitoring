import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react'; // Added fireEvent and act
import userEvent from '@testing-library/user-event';
import GraphConfigEditor from './GraphConfigEditor';

describe('GraphConfigEditor', () => {
  const mockQuestionYesNo = {
    id: 'q-yesno',
    type: 'yes_no',
    text: 'Yes/No Q',
    graphConfig: { enabled: true, rollingWindowSize: 7, thresholdValue: 50, alertCondition: 'above' }
  };
  const mockQuestionNumber = {
    id: 'q-num',
    type: 'number',
    text: 'Number Q',
    graphConfig: { enabled: true, rollingWindowSize: 7, thresholdValue: 10, alertCondition: 'below' }
  };
   const mockQuestionText = {
    id: 'q-text',
    type: 'free_text',
    text: 'Text Q',
    graphConfig: { enabled: false }
  };
   const mockQuestionMulti = {
     id: 'q-multi',
     type: 'multiple_choice',
     text: 'Multi Q',
     options: ['A', 'B', 'C'],
     graphConfig: { enabled: true, rollingWindowSize: 5, thresholdValue: 20, thresholdOption: 'B', alertCondition: 'below' }
   };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rolling window size input only for yes_no and multiple_choice', () => {
    const { rerender } = render(<GraphConfigEditor question={mockQuestionYesNo} onQuestionChange={mockOnChange} />);
    expect(screen.getByLabelText(/集計期間 \(回答数\):/)).toBeInTheDocument();
    expect(screen.getByLabelText(/集計期間 \(回答数\):/)).toHaveValue(7);

    rerender(<GraphConfigEditor question={mockQuestionMulti} onQuestionChange={mockOnChange} />);
    expect(screen.getByLabelText(/集計期間 \(回答数\):/)).toBeInTheDocument();
    expect(screen.getByLabelText(/集計期間 \(回答数\):/)).toHaveValue(5);

    rerender(<GraphConfigEditor question={mockQuestionNumber} onQuestionChange={mockOnChange} />);
    expect(screen.queryByLabelText(/集計期間 \(回答数\):/)).not.toBeInTheDocument();
  });

  it('does not render graph config for non-graphable types', () => {
    render(<GraphConfigEditor question={mockQuestionText} onQuestionChange={mockOnChange} />);
    expect(screen.queryByRole('checkbox', { name: /グラフに表示する/ })).not.toBeInTheDocument();
  });

  it('calls onQuestionChange when rolling window size is changed', async () => {
    render(<GraphConfigEditor question={mockQuestionYesNo} onQuestionChange={mockOnChange} />);
    const input = screen.getByLabelText(/集計期間 \(回答数\):/);

    // Use fireEvent.change to set the value directly
    fireEvent.change(input, { target: { value: '10' } });
    // Check the call with the processed value
    expect(mockOnChange).toHaveBeenLastCalledWith(mockQuestionYesNo.id, 'graphConfig', 10, 'rollingWindowSize');

    // Test minimum value constraint (typing '0' results in value 1)
    fireEvent.change(input, { target: { value: '0' } });
    expect(mockOnChange).toHaveBeenLastCalledWith(mockQuestionYesNo.id, 'graphConfig', 1, 'rollingWindowSize');

     // Test empty value (should result in undefined based on current component logic)
     fireEvent.change(input, { target: { value: '' } });
     expect(mockOnChange).toHaveBeenLastCalledWith(mockQuestionYesNo.id, 'graphConfig', undefined, 'rollingWindowSize');
  });

});
