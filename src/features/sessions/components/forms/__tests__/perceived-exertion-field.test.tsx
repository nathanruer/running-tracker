import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PerceivedExertionField } from '../perceived-exertion-field';
import { Form, FormField } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange?: (value: string) => void; value?: string }) => (
    <div data-testid="select" data-value={value}>
      <button type="button" onClick={() => onValueChange?.('-1')}>none</button>
      <button type="button" onClick={() => onValueChange?.('7')}>seven</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

const FormWrapper = ({ children }: { children: React.ReactElement }) => {
  const form = useForm({
    defaultValues: { rpe: null },
  });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="rpe"
        render={() => children}
      />
    </Form>
  );
};

describe('PerceivedExertionField', () => {
  it('should render select dropdown', () => {
    render(
      <FormWrapper>
        <PerceivedExertionField value={null} onChange={() => {}} />
      </FormWrapper>
    );

    expect(screen.getByTestId('select-rpe')).toBeInTheDocument();
  });

  it('should render label', () => {
    render(
      <FormWrapper>
        <PerceivedExertionField value={null} onChange={() => {}} />
      </FormWrapper>
    );

    expect(screen.getByText('RPE (Effort)')).toBeInTheDocument();
  });

  it('should show placeholder when no value', () => {
    render(
      <FormWrapper>
        <PerceivedExertionField value={null} onChange={() => {}} />
      </FormWrapper>
    );

    expect(screen.getByText('Note')).toBeInTheDocument();
  });

  it('should call onChange with null when "Pas de note" is selected', () => {
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <PerceivedExertionField value={5} onChange={onChange} />
      </FormWrapper>
    );

    fireEvent.click(screen.getByText('none'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('should call onChange with numeric value when selecting RPE', () => {
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <PerceivedExertionField value={null} onChange={onChange} />
      </FormWrapper>
    );

    fireEvent.click(screen.getByText('seven'));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('should accept undefined value', () => {
    render(
      <FormWrapper>
        <PerceivedExertionField value={undefined} onChange={() => {}} />
      </FormWrapper>
    );

    expect(screen.getByTestId('select-rpe')).toBeInTheDocument();
  });
});
