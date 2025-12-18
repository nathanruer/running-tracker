const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanIntervalDetails() {
  try {
    console.log('Starting interval_details cleanup...');
    
    // Find all sessions with interval_details that have the old fields
    const sessions = await prisma.training_sessions.findMany({
      where: {
        intervalDetails: {
          path: ['actualEffortPace'],
          not: null
        }
      }
    });
    
    console.log(`Found ${sessions.length} sessions with old interval details format`);
    
    for (const session of sessions) {
      if (!session.intervalDetails) continue;
      
      const details = typeof session.intervalDetails === 'string'
        ? JSON.parse(session.intervalDetails)
        : session.intervalDetails;
      
      // Remove the old fields
      const cleanedDetails = {
        ...details,
        actualEffortPace: undefined,
        actualEffortHR: undefined,
        actualRecoveryPace: undefined
      };
      
      // Remove undefined fields
      const finalDetails = Object.fromEntries(
        Object.entries(cleanedDetails).filter(([_, value]) => value !== undefined)
      );
      
      await prisma.training_sessions.update({
        where: { id: session.id },
        data: { intervalDetails: finalDetails }
      });
      
      console.log(`Cleaned session ${session.id}`);
    }
    
    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanIntervalDetails();