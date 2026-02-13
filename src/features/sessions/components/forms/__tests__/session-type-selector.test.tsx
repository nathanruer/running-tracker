import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionTypeSelector, PREDEFINED_TYPES } from '../session-type-selector';
import { Form, FormField } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
    <div>
      <button type="button" onClick={() => onValueChange?.('custom')}>custom</button>
      <button type="button" onClick={() => onValueChange?.('Footing')}>footing</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  SelectValue: () => <span>value</span>,
}));

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

    expect(screen.getByTestId('input-session-type')).toBeInTheDocument();
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

    const input = screen.getByTestId('input-session-type');
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

    expect(screen.getByTestId('input-session-type')).toHaveValue('Mon type');
  });

  it('should switch to custom when selecting custom option', () => {
    const onCustomTypeChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FormWrapper>
        <SessionTypeSelector
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
        <SessionTypeSelector
          value=""
          onChange={onChange}
          isCustomType={false}
          onCustomTypeChange={onCustomTypeChange}
        />
      </FormWrapper>
    );

    fireEvent.click(screen.getByText('footing'));

    expect(onChange).toHaveBeenCalledWith('Footing');
    expect(onCustomTypeChange).not.toHaveBeenCalled();
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
