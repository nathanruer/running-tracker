import { CustomTypeSelector } from './custom-type-selector';

interface SessionTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  isCustomType: boolean;
  onCustomTypeChange: (isCustom: boolean) => void;
}

const PREDEFINED_TYPES = ['Footing', 'Sortie longue', 'Fractionné'];

export function SessionTypeSelector(props: SessionTypeSelectorProps) {
  return (
    <CustomTypeSelector
      {...props}
      label="Type de séance"
      options={PREDEFINED_TYPES}
      selectPlaceholder="Sélectionnez un type"
      testId="session-type"
      className="flex-1"
    />
  );
}

export { PREDEFINED_TYPES };
