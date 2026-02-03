import type { UserProfile } from '@/lib/types/ai';
import { sanitizeForPrompt } from '@/lib/utils/sanitize';

export function buildProfileContext(userProfile: UserProfile, nextSessionNumber?: number): string {
  let context = 'Profil :\n';

  if (userProfile.age) {
    context += `- Âge : ${userProfile.age} ans\n`;
  }
  if (userProfile.maxHeartRate) {
    context += `- Fréquence cardiaque maximale : ${userProfile.maxHeartRate} bpm\n`;
  }
  if (userProfile.vma) {
    context += `- VMA : ${userProfile.vma} km/h\n`;
  }
  if (userProfile.goal) {
    context += `- Objectif : ${sanitizeForPrompt(userProfile.goal, 200)}\n`;
  }
  if (!userProfile.age && !userProfile.maxHeartRate && !userProfile.vma && !userProfile.goal) {
    context += '- Profil non renseigné\n';
  }

  if (nextSessionNumber) {
    context += `- Prochain numéro de séance : ${nextSessionNumber}\n`;
  }

  return context;
}
