import { CustomTypeSelector } from '../forms/custom-type-selector';

interface WorkoutTypeFieldProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  isCustomType: boolean;
  onCustomTypeChange: (isCustom: boolean) => void;
}

const WORKOUT_TYPES = [
  'TEMPO',
  'SEUIL',
  'VMA',
];

export function WorkoutTypeField(props: WorkoutTypeFieldProps) {
  return (
    <CustomTypeSelector
      {...props}
      label="Type de fractionné"
      options={WORKOUT_TYPES}
      selectPlaceholder="Type de fractionné"
      testId="workout-type"
    />
  );
}

export { WORKOUT_TYPES };
