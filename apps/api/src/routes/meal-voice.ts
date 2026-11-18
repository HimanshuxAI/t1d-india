// Meal Voice Input Routes

import { FastifyPluginAsync } from 'fastify';
import { AppError, ERROR_CODES } from '@t1d-india/shared';

export const mealVoiceRoutes: FastifyPluginAsync = async (app) => {
  // Process voice input for meal logging
  app.post('/process', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'No audio file uploaded', 400);
    }

    // Validate file type
    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a'];
    if (!allowedTypes.includes(data.mimetype)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid audio format. Use WebM, WAV, MP3, OGG, or M4A', 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    const chunks = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    if (buffer.length > maxSize) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Audio file too large. Max 5MB', 400);
    }

    // In production, send to speech-to-text service (Google Speech, Whisper, etc.)
    // For now, return mock response for Hindi/English/Hinglish
    const mockVoiceResult = {
      transcript: 'ek plate rajma chawal',
      language: 'hi-IN',
      confidence: 0.89,
      items: [
        {
          foodId: 'rajma-chawal-composite',
          name: 'Rajma-Chawal',
          quantityG: 350,
          prepMethod: 'pressure_cooked',
          carbsG: 89,
          proteinG: 17,
          fatG: 2.5,
        },
      ],
      mealType: 'lunch',
    };

    return reply.code(200).send({
      success: true,
      data: mockVoiceResult,
    });
  });
};