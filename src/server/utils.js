import XLSX from 'xlsx';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

const embeddingCache = new Map();

function generateQuestionVariations(question) {
  // Basic variations of the question
  const variations = [
    question,
    question.toLowerCase(),
    question.replace(/\?+$/, ''),  // Remove trailing question marks
    `What is ${question.toLowerCase()}`,
    `Can you explain ${question.toLowerCase()}`,
    `Tell me about ${question.toLowerCase()}`
  ];
  
  return [...new Set(variations)]; // Remove duplicates
}

export async function loadQAData(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const qaPairs = [];
    for (const row of rows) {
      const variations = generateQuestionVariations(row.Question);
      const embeddings = await Promise.all(
        variations.map(v => getEmbedding(v))
      );
      
      qaPairs.push({
        question: row.Question,
        answer: row.Answer,
        embeddings
      });
    }
    return qaPairs;
  } catch (error) {
    console.error('Error loading Q&A data:', error);
    throw error;
  }
}

export async function getEmbedding(text) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text);
  }
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    const embedding = response.data[0].embedding;
    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw error;
  }
}

export async function getChatGPTAnswer(question) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI ethics expert providing guidance on artificial intelligence ethics, guidelines, and best practices. Provide clear, accurate, and ethical answers."
        },
        {
          role: "user",
          content: question
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error getting ChatGPT response:', error);
    throw error;
  }
}

export function findBestMatch(userEmbedding, qaPairs) {
  let bestMatch = null;
  let bestSimilarity = -1;

  for (const pair of qaPairs) {
    // Compare with each embedding variation
    const similarities = pair.embeddings.map(embedding => 
      cosineSimilarity(userEmbedding, embedding)
    );
    const maxSimilarity = Math.max(...similarities);
    
    if (maxSimilarity > bestSimilarity) {
      bestSimilarity = maxSimilarity;
      bestMatch = pair;
    }
  }

  return { bestMatch, similarity: bestSimilarity };
}

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
} 