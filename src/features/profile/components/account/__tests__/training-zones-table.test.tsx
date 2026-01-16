import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrainingZonesTable } from '../training-zones-table';

describe('TrainingZonesTable', () => {
  it('should render all training zones', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    expect(screen.getByText('Z1')).toBeInTheDocument();
    expect(screen.getByText('Z2')).toBeInTheDocument();
    expect(screen.getByText('Z2+')).toBeInTheDocument();
    expect(screen.getByText('Z3')).toBeInTheDocument();
    expect(screen.getByText('Z4')).toBeInTheDocument();
    expect(screen.getByText('Z5')).toBeInTheDocument();
  });

  it('should display maxHeartRate and VMA in description', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    expect(screen.getByText(/calculées selon votre fc max \(180 bpm\) et vma \(14 km\/h\)/i)).toBeInTheDocument();
  });

  it('should calculate heart rate ranges correctly with suffix', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    // Z1: 60-68% of 180 = 108-122 (bpm suffix removed in display)
    expect(screen.getByText('108–122')).toBeInTheDocument();

    // Z5: 92-100% of 180 = 166-180
    expect(screen.getByText('166–180')).toBeInTheDocument();
  });

  it('should calculate pace ranges correctly with suffix', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    // VMA = 14 km/h
    // Z5: 95-105% VMA = 13.3-14.7 km/h = 4:05-4:31 min/km
    expect(screen.getByText(/4:05-4:31 \/km/)).toBeInTheDocument();
  });
});
