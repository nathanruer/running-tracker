import { describe, it, expect } from 'vitest';
import { parseTCXFile, detectIntervalStructure } from '@/lib/parsers/interval-tcx-parser';

describe('interval-tcx-parser', () => {
  const validTCX = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Id>2023-10-01T12:00:00Z</Id>
      <Lap StartTime="2023-10-01T12:00:00Z">
        <TotalTimeSeconds>600</TotalTimeSeconds>
        <DistanceMeters>1500</DistanceMeters>
        <AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm>
        <Intensity>Active</Intensity>
      </Lap>
      <Lap StartTime="2023-10-01T12:10:00Z">
        <TotalTimeSeconds>300</TotalTimeSeconds>
        <DistanceMeters>1000</DistanceMeters>
        <AverageHeartRateBpm><Value>170</Value></AverageHeartRateBpm>
        <Intensity>Active</Intensity>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

  it('should parse a valid TCX structure', () => {
    const result = parseTCXFile(validTCX);
    expect(result).not.toBeNull();
    expect(result?.laps).toHaveLength(2);
    expect(result?.totalDistanceMeters).toBe(2500);
    expect(result?.totalTimeSeconds).toBe(900);
  });

  it('should return null for corrupted XML', () => {
    const corruptedTCX = `<?xml version="1.0" encoding="UTF-8"?><Invalid>Unclosed tag`;
    expect(parseTCXFile(corruptedTCX)).toBeNull();
  });

  it('should detect intervals in laps', () => {
    const tcxWithIntervals = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Id>2023-10-01T12:00:00Z</Id>
      <Lap StartTime="12:00"><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>1500</DistanceMeters><Intensity>Active</Intensity></Lap>
      <Lap StartTime="12:10"><TotalTimeSeconds>120</TotalTimeSeconds><DistanceMeters>500</DistanceMeters><Intensity>Active</Intensity></Lap>
      <Lap StartTime="12:12"><TotalTimeSeconds>60</TotalTimeSeconds><DistanceMeters>100</DistanceMeters><Intensity>Active</Intensity></Lap>
      <Lap StartTime="12:13"><TotalTimeSeconds>120</TotalTimeSeconds><DistanceMeters>500</DistanceMeters><Intensity>Active</Intensity></Lap>
      <Lap StartTime="12:15"><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>1500</DistanceMeters><Intensity>Active</Intensity></Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
    
    const activity = parseTCXFile(tcxWithIntervals);
    expect(activity).not.toBeNull();
    if (!activity) return;

    const structure = detectIntervalStructure(activity.laps);
    expect(structure.isInterval).toBe(true);
    expect(structure.repetitionCount).toBe(2);
    expect(structure.steps[0].stepType).toBe('warmup');
    expect(structure.steps[1].stepType).toBe('effort');
    expect(structure.steps[2].stepType).toBe('recovery');
    expect(structure.steps[3].stepType).toBe('effort');
    expect(structure.steps[4].stepType).toBe('cooldown');
  });

  it('should handle TCX without Activity tag', () => {
    const invalidTCX = `<?xml version="1.0" encoding="UTF-8"?><TrainingCenterDatabase></TrainingCenterDatabase>`;
    expect(parseTCXFile(invalidTCX)).toBeNull();
  });
});
