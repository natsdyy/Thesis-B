/**
 * OpenAI Service for AI-powered grammar correction with LanguageTool fallback
 */

class OpenAIService {
  constructor() {
    this.apiKey = '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';
    this.baseURL = 'https://api.openai.com/v1';
    this.languageToolURL = 'https://api.languagetool.org/v2/check';
  }

  /**
   * Correct grammar and improve text using OpenAI GPT with LanguageTool fallback
   * @param {string} text - The text to correct
   * @param {string} context - Context about what type of text this is (role description, branch description, etc.)
   * @returns {Promise<string>} - The corrected text
   */
  async correctGrammar(text, context = 'general') {
    if (!text || !text.trim()) {
      throw new Error('No text provided for correction');
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(context)
            },
            {
              role: 'user',
              content: `Please correct the grammar, spelling, punctuation, and improve the clarity of this text while maintaining its original meaning and intent:\n\n"${text}"`
            }
          ],
          max_tokens: 500,
          temperature: 0.1, // Low temperature for consistent, accurate corrections
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const correctedText = data.choices[0].message.content.trim();
      
      // Remove quotes if OpenAI wrapped the response in quotes
      const cleanedText = correctedText.replace(/^["']|["']$/g, '');
      
      return cleanedText;

    } catch (error) {
      // Enhanced error handling with specific rate limit detection
      if (error.message.includes('rate limit') || error.message.includes('quota') || 
          error.message.includes('429') || error.message.includes('too many requests')) {
        throw new Error('OpenAI rate limit reached. Using LanguageTool fallback instead.');
      } else if (error.message.includes('network') || error.message.includes('fetch') || 
                 error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Using LanguageTool fallback instead.');
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new Error('OpenAI API key issue. Using LanguageTool fallback instead.');
      } else if (error.message.includes('500') || error.message.includes('internal server error')) {
        throw new Error('OpenAI server error. Using LanguageTool fallback instead.');
      } else {
        throw new Error(`OpenAI error: ${error.message}. Using LanguageTool fallback instead.`);
      }
    }
  }

  /**
   * Correct grammar using LanguageTool API as fallback
   * @param {string} text - The text to correct
   * @returns {Promise<string>} - The corrected text
   */
  async correctGrammarWithLanguageTool(text) {
    if (!text || !text.trim()) {
      throw new Error('No text provided for correction');
    }

    try {
      const response = await fetch(this.languageToolURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: text,
          language: 'en-US',
          enabledOnly: 'false'
        })
      });

      if (!response.ok) {
        throw new Error(`LanguageTool API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.matches || !Array.isArray(data.matches)) {
        throw new Error('Invalid response format from LanguageTool API');
      }

      // Apply corrections to the text
      let correctedText = text;
      const corrections = data.matches
        .filter(match => match.replacements && match.replacements.length > 0)
        .sort((a, b) => b.offset - a.offset); // Sort in reverse order to avoid offset issues

      for (const match of corrections) {
        const replacement = match.replacements[0];
        if (replacement && replacement.value) {
          const before = correctedText.substring(0, match.offset);
          const after = correctedText.substring(match.offset + match.length);
          correctedText = before + replacement.value + after;
        }
      }

      return correctedText;

    } catch (error) {
      throw new Error(`LanguageTool correction failed: ${error.message}. Using local fallback instead.`);
    }
  }

  /**
   * Get system prompt based on context
   * @param {string} context - The context type
   * @returns {string} - The system prompt
   */
  getSystemPrompt(context) {
    const basePrompt = `You are a professional grammar and writing assistant. Your task is to correct grammar, spelling, punctuation, and improve clarity while preserving the original meaning and tone.

Rules:
1. Fix all grammatical errors (subject-verb agreement, tense consistency, etc.)
2. Correct spelling mistakes and typos
3. Improve punctuation (commas, periods, apostrophes, quotes)
4. Enhance clarity and readability
5. Maintain the original meaning and intent
6. Keep the same tone and style
7. Don't add new information or change the core message
8. Return only the corrected text without explanations or quotes
9. If the text is already correct, return it unchanged`;

    const contextPrompts = {
      'role': `${basePrompt}

Context: This is a role description for a business/organizational role management system. Focus on:
- Professional business language
- Clear role responsibilities and permissions
- Proper use of terms like "access control", "user management", "permissions"
- Formal but accessible tone`,

      'branch': `${basePrompt}

Context: This is a branch description for a business location/office. Focus on:
- Professional business language
- Clear service descriptions
- Proper use of terms like "customer service", "banking services", "office hours"
- Welcoming but professional tone`,

      'general': basePrompt
    };

    return contextPrompts[context] || contextPrompts['general'];
  }

  /**
   * Test the API connection
   * @returns {Promise<boolean>} - True if API is working
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  /**
   * Test LanguageTool connection
   * @returns {Promise<boolean>} - True if API is working
   */
  async testLanguageToolConnection() {
    try {
      const response = await fetch(this.languageToolURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: 'test',
          language: 'en-US'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('LanguageTool connection test failed:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const openaiService = new OpenAIService();

// Export the class for testing purposes
export { OpenAIService };
