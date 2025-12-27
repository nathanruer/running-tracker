import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrainingZonesTable } from '../training-zones-table';

describe('TrainingZonesTable', () => {
  it('should render all training zones', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    expect(screen.getByText(/récup \/ très facile/i)).toBeInTheDocument();
    expect(screen.getByText(/ef zone 2 \(base\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ef zone 2 haute/i)).toBeInTheDocument();
    expect(screen.getByText(/tempo \/ seuil aérobie/i)).toBeInTheDocument();
    expect(screen.getByText(/seuil anaérobie/i)).toBeInTheDocument();
    expect(screen.getByText(/vma \/ intervalles courts/i)).toBeInTheDocument();
  });

  it('should display maxHeartRate and VMA in description', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    expect(screen.getByText(/180 bpm/i)).toBeInTheDocument();
    expect(screen.getByText(/14 km\/h/i)).toBeInTheDocument();
  });

  it('should show "--" when maxHeartRate is not provided', () => {
    render(<TrainingZonesTable vma={14} />);

    expect(screen.getByText(/-- bpm/i)).toBeInTheDocument();
  });

  it('should show "--" when VMA is not provided', () => {
    render(<TrainingZonesTable maxHeartRate={180} />);

    expect(screen.getByText(/-- km\/h/i)).toBeInTheDocument();
  });

  it('should calculate heart rate ranges correctly', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    // Récup zone: 60-68% of 180 = 108-122 bpm
    expect(screen.getByText('108–122')).toBeInTheDocument();

    // VMA zone: 92-100% of 180 = 166-180 bpm
    expect(screen.getByText('166–180')).toBeInTheDocument();
  });

  it('should calculate pace ranges correctly', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    // VMA = 14 km/h
    // VMA zone: 95-105% VMA = 13.3-14.7 km/h = 4:05-4:31 min/km
    expect(screen.getByText(/4:05-4:31/)).toBeInTheDocument();
  });

  it('should display percentage ranges for FCM', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    expect(screen.getByText('60–68%')).toBeInTheDocument();
    expect(screen.getByText('68–75%')).toBeInTheDocument();
    expect(screen.getByText('75–80%')).toBeInTheDocument();
    expect(screen.getByText('80–88%')).toBeInTheDocument();
    expect(screen.getByText('88–92%')).toBeInTheDocument();
    expect(screen.getByText('92–100%')).toBeInTheDocument();
  });

  it('should show "--" for FC cible when maxHeartRate is missing', () => {
    render(<TrainingZonesTable vma={14} />);

    const rows = screen.getAllByRole('row');
    // Skip header row, check data rows
    rows.slice(1).forEach((row) => {
      expect(row).toHaveTextContent('--');
    });
  });

  it('should show "--" for pace when VMA is missing', () => {
    render(<TrainingZonesTable maxHeartRate={180} />);

    const rows = screen.getAllByRole('row');
    // Each row should have "--" in the pace column
    rows.slice(1).forEach((row) => {
      expect(row).toHaveTextContent('--');
    });
  });

  it('should render table headers', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    expect(screen.getByText('Zone')).toBeInTheDocument();
    expect(screen.getByText('% FCM')).toBeInTheDocument();
    expect(screen.getByText('FC cible')).toBeInTheDocument();
    expect(screen.getByText('Allure approx.')).toBeInTheDocument();
  });

  it('should render card title and description', () => {
    render(<TrainingZonesTable maxHeartRate={180} vma={14} />);

    expect(screen.getByText(/zones d'entraînement/i)).toBeInTheDocument();
    expect(screen.getByText(/calculées sur la base de votre/i)).toBeInTheDocument();
  });
});
