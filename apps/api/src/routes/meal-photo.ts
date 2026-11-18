// Meal Photo Analysis Routes

import { FastifyPluginAsync } from 'fastify';
import { AppError, ERROR_CODES } from '@t1d-india/shared';

export const mealPhotoRoutes: FastifyPluginAsync = async (app) => {
  // Analyze meal photo for food recognition and carb estimation
  app.post('/analyze', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'No file uploaded', 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(data.mimetype)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid file type. Use JPEG, PNG, or WebP', 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    const chunks = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    if (buffer.length > maxSize) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'File too large. Max 10MB', 400);
    }

    // Convert to base64 for ML service
    const base64Image = buffer.toString('base64');
    const mimeType = data.mimetype;

    // Call ML service for food recognition
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const mlApiKey = process.env.ML_SERVICE_API_KEY || '';
      
      // In production, call actual ML service
      // For now, return mock response
      const mockResponse = {
        foodClass: 'rajma_chawal',
        foodClassConfidence: 0.87,
        portionG: 350,
        carbsG: 89,
        carbsConfidence: 0.82,
        attentionMap: null,
      };

      return reply.code(200).send({
        success: true,
        data: mockResponse,
      });
    } catch (error) {
      request.log.error({ err: error }, 'Photo analysis failed');
      throw new AppError(ERROR_CODES.ML_INFERENCE_FAILED, 'Failed to analyze photo', 500);
    }
  });

  // OCR for nutrition labels
  app.post('/ocr', {
    preHandler: app.requireRole('PATIENT', 'CAREGIVER'),
  }, async (request, reply) => {
    const data = await request.file();
    
    if (!data) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'No file uploaded', 400);
    }

    // In production, use Tesseract.js or cloud OCR service
    // For now, return mock response
    const mockOcrResult = {
      text: 'Nutrition Facts\nServing Size 100g\nCalories 130\nTotal Carbohydrate 28g\nProtein 2.7g\nTotal Fat 0.3g',
      confidence: 0.85,
      extractedNutrition: {
        calories: 130,
        carbsG: 28,
        proteinG: 2.7,
        fatG: 0.3,
        servingSizeG: 100,
      },
    };

    return reply.code(200).send({
      success: true,
      data: mockOcrResult,
    });
  });
};