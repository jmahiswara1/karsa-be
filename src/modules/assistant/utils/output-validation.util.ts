import { Logger } from '@nestjs/common';

const logger = new Logger('OutputValidation');

// Type definitions
interface AIResponse {
  reply?: string;
  action?: string | null;
  actionData?: unknown;
  action_data?: unknown;
}

// Keyword yang menunjukkan AI keluar dari domain Karsa
const OFF_TOPIC_KEYWORDS = [
  // General knowledge
  'menurut wikipedia',
  'secara historis',
  'dalam sejarah',
  'fakta ilmiah',
  'penelitian menunjukkan',

  // Personal advice
  'sebagai dokter',
  'sebagai pengacara',
  'saran medis',
  'saran hukum',
  'saran keuangan',

  // Creative writing
  'cerita pendek',
  'puisi berikut',
  'mari saya tulis cerita',

  // Roleplay
  'berpura-pura menjadi',
  'bertindak sebagai',
  'sekarang saya adalah',

  // English equivalents
  'according to wikipedia',
  'historically',
  'scientific research shows',
  'as a doctor',
  'as a lawyer',
  'medical advice',
  'legal advice',
  'financial advice',
  'short story',
  'poem',
  'let me write a story',
  'pretend to be',
  'act as',
  'i am now',
];

// Keyword yang menunjukkan domain Karsa (positif)
const ON_TOPIC_KEYWORDS = [
  'task',
  'tugas',
  'proyek',
  'project',
  'deadline',
  'tenggat',
  'prioritas',
  'priority',
  'jadwal',
  'schedule',
  'catatan',
  'note',
  'reminder',
  'pengingat',
  'buat',
  'create',
  'update',
  'delete',
  'hapus',
  'edit',
];

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  cleanedReply?: string;
}

export function validateAIOutput(
  response: AIResponse,
  originalPrompt: string,
): ValidationResult {
  try {
    // Cek 1: Validasi struktur JSON
    if (!response || typeof response !== 'object') {
      logger.warn('Invalid response structure: not an object');
      return {
        isValid: false,
        reason: 'Invalid response structure',
      };
    }

    if (!('reply' in response)) {
      logger.warn('Invalid response structure: missing reply field');
      return {
        isValid: false,
        reason: 'Missing reply field',
      };
    }

    const reply = response.reply ?? '';
    const replyLower = reply.toLowerCase();

    // Cek 2: Deteksi off-topic content
    const offTopicMatches = OFF_TOPIC_KEYWORDS.filter((keyword) =>
      replyLower.includes(keyword),
    );

    if (offTopicMatches.length > 0) {
      logger.warn(
        `Off-topic content detected. Matched keywords: ${offTopicMatches.join(', ')}`,
      );
      return {
        isValid: false,
        reason: `Off-topic content detected: ${offTopicMatches.join(', ')}`,
        cleanedReply:
          'Maaf, saya hanya bisa membantu dengan tugas manajemen dan produktivitas di Karsa. Apakah ada task atau proyek yang ingin Anda buat?',
      };
    }

    // Cek 3: Pastikan response terkait dengan prompt
    const promptLower = originalPrompt.toLowerCase();
    const hasOnTopicKeywords = ON_TOPIC_KEYWORDS.some(
      (keyword) =>
        replyLower.includes(keyword) || promptLower.includes(keyword),
    );

    // Jika reply sangat panjang (>500 karakter) tapi tidak ada keyword domain, kemungkinan hallucinate
    if (reply.length > 500 && !hasOnTopicKeywords) {
      logger.warn(
        'Long response without domain keywords - possible hallucination',
      );
      return {
        isValid: false,
        reason: 'Possible hallucination: long response without domain context',
        cleanedReply:
          'Maaf, saya mengalami kesulitan memahami permintaan Anda. Bisa tolong jelaskan lebih spesifik tentang task atau proyek yang ingin Anda buat?',
      };
    }

    // Cek 4: Validasi action field jika ada
    if (
      'action' in response &&
      response.action !== null &&
      response.action !== undefined
    ) {
      const validActions = [
        'CREATE_TASK',
        'CREATE_PROJECT',
        'CREATE_NOTE',
        'SCHEDULE_TASK',
        'UPDATE_TASK',
        'DELETE_TASK',
        'LIST_TASKS',
        'LIST_PROJECTS',
      ];

      if (!validActions.includes(response.action)) {
        logger.warn(`Invalid action: ${response.action}`);
        return {
          isValid: false,
          reason: `Invalid action: ${response.action}`,
        };
      }
    }

    // Semua validasi lolos
    return {
      isValid: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Validation error: ${errorMessage}`);
    return {
      isValid: false,
      reason: `Validation error: ${errorMessage}`,
    };
  }
}

export function sanitizeResponse(response: AIResponse): AIResponse {
  // Hapus field yang tidak perlu dan pastikan struktur konsisten
  return {
    reply: response.reply ?? '',
    action: response.action ?? null,
    actionData: response.actionData ?? response.action_data ?? null,
  };
}
