import { Logger } from '@nestjs/common';

const SUSPICIOUS_KEYWORDS = [
  // English
  'ignore previous',
  'ignore all',
  'forget instructions',
  'override system',
  'system prompt',
  'jailbreak',
  'do anything now',
  'act as',
  'pretend to be',
  'you are now',
  'new instructions',
  'reveal your',
  'show me your prompt',

  // Indonesian
  'abaikan instruksi',
  'lupakan perintah',
  'override sistem',
  'prompt sistem',
  'buka prompt',
  'tunjukkan prompt',
  'bertindak sebagai',
  'berpura-pura jadi',
  'kamu sekarang adalah',
];

const logger = new Logger('PromptSecurity');

export function detectSuspiciousPrompt(
  prompt: string,
  userId: string,
): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const matchedKeywords = SUSPICIOUS_KEYWORDS.filter((keyword) =>
    lowerPrompt.includes(keyword),
  );

  if (matchedKeywords.length > 0) {
    logger.warn(
      `Suspicious prompt detected from user ${userId}. ` +
        `Matched keywords: ${matchedKeywords.join(', ')}. ` +
        `Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
    );
    return true;
  }

  return false;
}

export function logPromptMetadata(
  prompt: string,
  userId: string,
  isSuspicious: boolean,
): void {
  // Log all prompts for monitoring (can be used for analytics later)
  logger.log(
    `Prompt from user ${userId}: ` +
      `length=${prompt.length}, ` +
      `suspicious=${isSuspicious}, ` +
      `preview="${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
  );
}
