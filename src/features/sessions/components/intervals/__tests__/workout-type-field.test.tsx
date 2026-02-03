import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkoutTypeField, WORKOUT_TYPES } from '../workout-type-field';
import { Form, FormField } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange?: (value: string) => void; value?: string }) => (
    <div data-testid="select" data-value={value}>
      <button type="button" onClick={() => onValueChange?.('custom')}>custom</button>
      <button type="button" onClick={() => onValueChange?.('TEMPO')}>tempo</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>value</span>,
}));

const FormWrapper = ({ children }: { children: React.ReactElement }) => {
  const form = useForm({
    defaultValues: { workoutType: '' },
  });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="workoutType"
        render={() => children}
      />
    </Form>
  );
};

describe('WorkoutTypeField', () => {
  it('should render select dropdown by default', () => {
    render(
      <FormWrapper>
        <WorkoutTypeField
          value=""
          onChange={() => {}}
          isCustomType={false}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('should render label', () => {
    render(
      <FormWrapper>
        <WorkoutTypeField
          value=""
          onChange={() => {}}
          isCustomType={false}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByText('Type de séance')).toBeInTheDocument();
  });

  it('should render custom input when isCustomType is true', () => {
    render(
      <FormWrapper>
        <WorkoutTypeField
          value=""
          onChange={() => {}}
          isCustomType={true}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByPlaceholderText('Type personnalisé')).toBeInTheDocument();
  });

  it('should call onChange with custom value', () => {
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <WorkoutTypeField
          value=""
          onChange={onChange}
          isCustomType={true}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    const input = screen.getByPlaceholderText('Type personnalisé');
    fireEvent.change(input, { target: { value: 'PYRAMIDAL' } });

    expect(onChange).toHaveBeenCalledWith('PYRAMIDAL');
  });

  it('should reset to select mode when reset button is clicked', () => {
    const onCustomTypeChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <WorkoutTypeField
          value="CUSTOM"
          onChange={onChange}
          isCustomType={true}
          onCustomTypeChange={onCustomTypeChange}
        />
      </FormWrapper>
    );

    const resetButton = screen.getByRole('button');
    fireEvent.click(resetButton);

    expect(onCustomTypeChange).toHaveBeenCalledWith(false);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should show current value in input', () => {
    render(
      <FormWrapper>
        <WorkoutTypeField
          value="FARTLEK"
          onChange={() => {}}
          isCustomType={true}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByPlaceholderText('Type personnalisé')).toHaveValue('FARTLEK');
  });

  it('should handle null value', () => {
    render(
      <FormWrapper>
        <WorkoutTypeField
          value={null}
          onChange={() => {}}
          isCustomType={false}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('should handle undefined value', () => {
    render(
      <FormWrapper>
        <WorkoutTypeField
          value={undefined}
          onChange={() => {}}
          isCustomType={false}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  it('should switch to custom type when selecting custom', () => {
    const onCustomTypeChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <WorkoutTypeField
          value=""
          onChange={onChange}
          isCustomType={false}
          onCustomTypeChange={onCustomTypeChange}
        />
      </FormWrapper>
    );

    fireEvent.click(screen.getByText('custom'));

    expect(onCustomTypeChange).toHaveBeenCalledWith(true);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should update value when selecting predefined type', () => {
    const onCustomTypeChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <WorkoutTypeField
          value=""
          onChange={onChange}
          isCustomType={false}
          onCustomTypeChange={onCustomTypeChange}
        />
      </FormWrapper>
    );

    fireEvent.click(screen.getByText('tempo'));

    expect(onChange).toHaveBeenCalledWith('TEMPO');
    expect(onCustomTypeChange).not.toHaveBeenCalled();
  });
});

describe('WORKOUT_TYPES', () => {
  it('should contain expected workout types', () => {
    expect(WORKOUT_TYPES).toContain('TEMPO');
    expect(WORKOUT_TYPES).toContain('SEUIL');
    expect(WORKOUT_TYPES).toContain('VMA');
  });

  it('should have 3 workout types', () => {
    expect(WORKOUT_TYPES).toHaveLength(3);
  });
});
