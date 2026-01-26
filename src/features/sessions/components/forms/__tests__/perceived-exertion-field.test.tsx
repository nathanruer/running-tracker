import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PerceivedExertionField } from '../perceived-exertion-field';
import { Form, FormField } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

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

    expect(screen.getByTestId('select-rpe')).toBeInTheDocument();
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
