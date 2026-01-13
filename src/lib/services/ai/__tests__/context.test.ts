import { describe, it, expect } from 'vitest';
import { buildContextMessage } from '../context';
import type { Session } from '@/lib/types';

describe('AI Context Building', () => {
    const userProfile = {
        age: 30,
        maxHeartRate: 190,
        vma: 15.0,
        goal: '10km sub 50'
    };

    it('should separate Interval sessions from averaged stats and show effort pace', () => {
        const sessions: Session[] = [
            {
                date: '2026-01-10T00:00:00.000Z',
                sessionType: 'Footing',
                duration: '00:45:00',
                distance: 7.5,
                avgPace: '06:00',
                avgHeartRate: 140,
                perceivedExertion: 3,
                comments: 'Easy run',
                intervalDetails: null,
                sessionNumber: 1,
                week: 1,
                status: 'completed'
            },
            {
                date: '2026-01-08T00:00:00.000Z',
                sessionType: 'Footing',
                duration: '00:45:00',
                distance: 7.5,
                avgPace: '06:00',
                avgHeartRate: 142,
                perceivedExertion: 3,
                comments: 'Another easy run',
                intervalDetails: null,
                sessionNumber: 2,
                week: 1,
                status: 'completed'
            },
            {
                date: '2026-01-05T00:00:00.000Z',
                sessionType: 'Fractionné',
                duration: '00:40:00',
                distance: 7.0,
                avgPace: '05:43',
                avgHeartRate: 165,
                perceivedExertion: 8,
                comments: 'Hard intervals',
                intervalDetails: {
                    workoutType: 'VMA',
                    repetitionCount: 10,
                    effortDuration: '01:00',
                    recoveryDuration: '01:00',
                    effortDistance: null,
                    recoveryDistance: null,
                    targetEffortPace: null,
                    targetEffortHR: null,
                    targetRecoveryPace: null,
                    steps: [
                        { stepNumber: 1, stepType: 'warmup', duration: '15:00', distance: 2.5, pace: '06:00', hr: null },
                        { stepNumber: 2, stepType: 'effort', duration: '01:00', distance: 0.25, pace: '04:00', hr: 170 }, // 4:00/km
                        { stepNumber: 3, stepType: 'recovery', duration: '01:00', distance: 0.15, pace: '06:40', hr: 140 },
                        { stepNumber: 4, stepType: 'effort', duration: '01:00', distance: 0.25, pace: '04:00', hr: 172 },
                        { stepNumber: 5, stepType: 'recovery', duration: '01:00', distance: 0.15, pace: '06:40', hr: 142 },
                    ]
                },
                sessionNumber: 3,
                week: 1,
                status: 'completed'
            }
        ];

        const context = buildContextMessage({
            currentWeekSessions: [],
            allSessions: sessions,
            userProfile,
            nextSessionNumber: 4
        });

        expect(context).toContain('Footing (2 dern.): moy. 7.5km');

        expect(context).not.toContain('Fractionné (1 dern.): moy.');

        expect(context).toContain('Dernières séances de qualité (Fractionné/VMA)');
        expect(context).toContain('Structure: VMA: 10x01:00 R:01:00 @ 04:00/km (efforts)');
    });
});
