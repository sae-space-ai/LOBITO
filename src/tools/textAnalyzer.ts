// ============================================================
// HERRAMIENTA: ANALIZADOR DE TEXTO
// Analiza contenido: estadísticas, frecuencia de palabras, estructura
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { TaskResult, Tool } from '../types';

function analyzeText(text: string): Record<string, unknown> {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Frecuencia de palabras
  const wordFreq: Record<string, number> = {};
  const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'o', 'a', 'que', 'es', 'por', 'con', 'para', 'se', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'este', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'ser', 'también', 'me', 'ha', 'si', 'hasta', 'donde', 'son', 'las', 'fue', 'su', 'hay']);
  
  words.forEach(word => {
    const clean = word.toLowerCase().replace(/[^a-záéíóúñü]/gi, '');
    if (clean.length > 2 && !stopWords.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });

  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Estadísticas
  const charCount = text.length;
  const charCountNoSpaces = text.replace(/\s/g, '').length;
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount * 10) / 10 : 0;
  const avgCharsPerWord = wordCount > 0 ? Math.round(charCountNoSpaces / wordCount * 10) / 10 : 0;

  // Detección de idioma (simple)
  const spanishIndicators = ['el', 'la', 'los', 'las', 'de', 'del', 'en', 'que', 'por', 'con', 'para', 'una', 'como', 'más', 'pero', 'este', 'muy', 'sin', 'sobre', 'ser', 'también', 'hasta', 'donde', 'son'];
  const englishIndicators = ['the', 'is', 'at', 'which', 'on', 'and', 'or', 'a', 'an', 'of', 'to', 'in', 'for', 'with', 'that', 'this', 'from', 'by', 'are', 'was'];
  
  const lowerText = text.toLowerCase();
  const spanishScore = spanishIndicators.filter(w => lowerText.includes(` ${w} `)).length;
  const englishScore = englishIndicators.filter(w => lowerText.includes(` ${w} `)).length;
  const detectedLanguage = spanishScore >= englishScore ? 'es' : 'en';

  // Sentimiento básico
  const positiveWords = ['bueno', 'excelente', 'genial', 'increíble', 'perfecto', 'mejor', 'favor', 'éxito', 'logro', 'positivo', 'good', 'great', 'excellent', 'amazing', 'perfect', 'best', 'success'];
  const negativeWords = ['malo', 'terrible', 'horrible', 'pésimo', 'peor', 'error', 'fracaso', 'negativo', 'problema', 'difícil', 'bad', 'terrible', 'horrible', 'worst', 'error', 'failure', 'negative', 'problem', 'difficult'];
  
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;
  const sentiment = positiveCount > negativeCount ? 'positivo' : negativeCount > positiveCount ? 'negativo' : 'neutral';

  return {
    statistics: {
      characters: charCount,
      charactersNoSpaces: charCountNoSpaces,
      words: wordCount,
      sentences: sentenceCount,
      paragraphs: paragraphCount,
      avgWordsPerSentence,
      avgCharsPerWord,
    },
    topWords,
    detectedLanguage,
    sentiment,
    wordFrequency: wordFreq,
    readability: {
      score: Math.round((100 - avgWordsPerSentence * 2) * 10) / 10,
      level: avgWordsPerSentence < 15 ? 'fácil' : avgWordsPerSentence < 25 ? 'moderado' : 'complejo',
    },
  };
}

export const textAnalyzerTool: Tool = {
  id: 'text_analyzer',
  name: 'Analizador de Texto',
  description: 'Analiza contenido textual: estadísticas, frecuencia de palabras, sentimiento, idioma detectado y legibilidad.',
  status: 'available',
  parameters: [
    { name: 'text', type: 'string', required: true, description: 'Texto a analizar' },
    { name: 'analysisType', type: 'string', required: false, description: 'Tipo de análisis: full, stats, sentiment' },
  ],
  execute: async (params: Record<string, unknown>): Promise<TaskResult> => {
    const startTime = Date.now();
    const text = (params.text as string) || '';

    if (!text || text.trim().length === 0) {
      return {
        taskId: uuidv4(),
        tool: 'text_analyzer',
        status: 'error',
        data: null,
        summary: 'Error: No se proporcionó texto para analizar',
        executedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    }

    const result = analyzeText(text);

    return {
      taskId: uuidv4(),
      tool: 'text_analyzer',
      status: 'success',
      data: result,
      summary: `Análisis completado: ${(result.statistics as {words: number}).words} palabras, ${(result.statistics as {sentences: number}).sentences} oraciones, sentimiento: ${result.sentiment}, idioma: ${result.detectedLanguage === 'es' ? 'español' : 'inglés'}`,
      executedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  },
};
