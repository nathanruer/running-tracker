import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EffortRecoverySection } from '../effort-recovery-section';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import type { IntervalFormValues } from '@/lib/validation/session-form';

const FormWrapper = ({
  children,
  defaultValues = {},
}: {
  children: (props: { control: ReturnType<typeof useForm<IntervalFormValues>>['control'] }) => React.ReactNode;
  defaultValues?: Partial<IntervalFormValues>;
}) => {
  const form = useForm<IntervalFormValues>({
    defaultValues: {
      repetitionCount: 1,
      workoutType: '',
      effortDuration: '',
      effortDistance: null,
      recoveryDuration: '',
      recoveryDistance: null,
      targetEffortPace: '',
      targetRecoveryPace: '',
      targetEffortHR: null,
      ...defaultValues,
    },
  });
  return <Form {...form}>{children({ control: form.control })}</Form>;
};

describe('EffortRecoverySection', () => {
  const defaultProps = {
    label: 'Effort',
    mode: 'duration' as const,
    onModeChange: vi.fn(),
    fieldPrefix: 'effort' as const,
  };

  it('should render section label', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} control={control} />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Effort')).toBeInTheDocument();
  });

  it('should render duration field when mode is duration', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} mode="duration" control={control} />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Durée')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('00:00').length).toBeGreaterThan(0);
  });

  it('should render distance field when mode is distance', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} mode="distance" control={control} />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Distance (km)')).toBeInTheDocument();
  });

  it('should render pace field by default', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} control={control} />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Allure cible')).toBeInTheDocument();
  });

  it('should render heart rate field by default', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} control={control} />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('FC cible')).toBeInTheDocument();
  });

  it('should hide pace field when showPace is false', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} control={control} showPace={false} />
        )}
      </FormWrapper>
    );

    expect(screen.queryByText('Allure cible')).not.toBeInTheDocument();
  });

  it('should hide heart rate field when showHeartRate is false', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} control={control} showHeartRate={false} />
        )}
      </FormWrapper>
    );

    expect(screen.queryByText('FC cible')).not.toBeInTheDocument();
  });

  it('should render mode toggle button', () => {
    const { container } = render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection {...defaultProps} control={control} />
        )}
      </FormWrapper>
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render recovery section correctly', () => {
    render(
      <FormWrapper>
        {({ control }) => (
          <EffortRecoverySection
            {...defaultProps}
            label="Récupération"
            fieldPrefix="recovery"
            control={control}
          />
        )}
      </FormWrapper>
    );

    expect(screen.getByText('Récupération')).toBeInTheDocument();
  });
});
