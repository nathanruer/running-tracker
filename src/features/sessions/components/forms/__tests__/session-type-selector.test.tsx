import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionTypeSelector, PREDEFINED_TYPES } from '../session-type-selector';
import { Form, FormField } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

const FormWrapper = ({ children, defaultValue = '' }: { children: React.ReactElement; defaultValue?: string }) => {
  const form = useForm({
    defaultValues: { sessionType: defaultValue },
  });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="sessionType"
        render={() => children}
      />
    </Form>
  );
};

describe('SessionTypeSelector', () => {
  it('should render select dropdown by default', () => {
    render(
      <FormWrapper>
        <SessionTypeSelector
          value=""
          onChange={() => {}}
          isCustomType={false}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByTestId('select-session-type')).toBeInTheDocument();
  });

  it('should render label', () => {
    render(
      <FormWrapper>
        <SessionTypeSelector
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
        <SessionTypeSelector
          value=""
          onChange={() => {}}
          isCustomType={true}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByTestId('input-custom-session-type')).toBeInTheDocument();
    expect(screen.getByTestId('btn-reset-session-type')).toBeInTheDocument();
  });

  it('should call onChange with custom type value', () => {
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <SessionTypeSelector
          value=""
          onChange={onChange}
          isCustomType={true}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    const input = screen.getByTestId('input-custom-session-type');
    fireEvent.change(input, { target: { value: 'Mon type personnalisé' } });

    expect(onChange).toHaveBeenCalledWith('Mon type personnalisé');
  });

  it('should reset to select when reset button is clicked', () => {
    const onCustomTypeChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <SessionTypeSelector
          value="Test"
          onChange={onChange}
          isCustomType={true}
          onCustomTypeChange={onCustomTypeChange}
        />
      </FormWrapper>
    );

    fireEvent.click(screen.getByTestId('btn-reset-session-type'));

    expect(onCustomTypeChange).toHaveBeenCalledWith(false);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should show current value in input', () => {
    render(
      <FormWrapper>
        <SessionTypeSelector
          value="Mon type"
          onChange={() => {}}
          isCustomType={true}
          onCustomTypeChange={() => {}}
        />
      </FormWrapper>
    );

    expect(screen.getByTestId('input-custom-session-type')).toHaveValue('Mon type');
  });
});

describe('PREDEFINED_TYPES', () => {
  it('should contain expected session types', () => {
    expect(PREDEFINED_TYPES).toContain('Footing');
    expect(PREDEFINED_TYPES).toContain('Sortie longue');
    expect(PREDEFINED_TYPES).toContain('Fractionné');
  });

  it('should have 3 predefined types', () => {
    expect(PREDEFINED_TYPES).toHaveLength(3);
  });
});
