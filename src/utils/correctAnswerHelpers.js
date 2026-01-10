/**
 * Helper functions for handling correct_answers field
 * Supports both Array (legacy) and Map/Object (new) formats
 */

/**
 * Get correct answer labels from correct_answers field
 * @param {Array|Object} correctAnswers - Can be Array ['A', 'B'] or Map {'A': 'explanation', 'B': 'explanation'} or {'A': 'false', 'B': 'true'} (legacy format)
 * @returns {Array} Array of correct answer labels ['A', 'B']
 */
export const getCorrectAnswerLabels = (correctAnswers) => {
  if (!correctAnswers) return [];
  
  if (Array.isArray(correctAnswers)) {
    return correctAnswers;
  }
  
  if (typeof correctAnswers === 'object') {
    // Handle legacy format where values might be "true"/"false" strings
    // Only include keys where value is truthy (not "false", not empty string, not falsy)
    return Object.keys(correctAnswers).filter(key => {
      const value = correctAnswers[key];
      // If value is explicitly "false", exclude it
      if (value === 'false' || value === false) return false;
      // If value is empty string and key suggests it's not a correct answer, exclude it
      // But if it's empty string and it's the only format we have, include it (for backward compatibility)
      // For now, include all non-"false" entries to maintain backward compatibility
      return value !== 'false' && value !== false;
    });
  }
  
  return [];
};

/**
 * Check if a label is a correct answer
 * @param {Array|Object} correctAnswers - Can be Array ['A', 'B'] or Map {'A': 'explanation', 'B': 'explanation'} or {'A': 'false', 'B': 'true'} (legacy format)
 * @param {string} label - Label to check ('A', 'B', etc.)
 * @returns {boolean} True if label is in correct answers
 */
export const isCorrectAnswer = (correctAnswers, label) => {
  if (!correctAnswers || !label) return false;
  
  if (Array.isArray(correctAnswers)) {
    return correctAnswers.includes(label);
  }
  
  if (typeof correctAnswers === 'object') {
    // Check if label exists in object
    if (!(label in correctAnswers)) return false;
    
    // Handle legacy format where values might be "true"/"false" strings
    const value = correctAnswers[label];
    // If value is explicitly "false", it's not a correct answer
    if (value === 'false' || value === false) return false;
    
    // Otherwise, if the key exists and value is not "false", it's a correct answer
    return true;
  }
  
  return false;
};

/**
 * Get explanation for a specific answer label
 * @param {Array|Object} correctAnswers - Can be Array ['A', 'B'] or Map {'A': 'explanation', 'B': 'explanation'}
 * @param {string} label - Label to get explanation for
 * @returns {string|null} Explanation text or null if not found
 */
export const getAnswerExplanation = (correctAnswers, label) => {
  if (!correctAnswers || !label) return null;
  
  if (Array.isArray(correctAnswers)) {
    // Legacy format has no explanations
    return null;
  }
  
  if (typeof correctAnswers === 'object') {
    return correctAnswers[label] || null;
  }
  
  return null;
};

/**
 * Convert correct_answers to Map format for consistency
 * @param {Array|Object} correctAnswers - Input in any format
 * @param {Array} options - Question options to get explanations from
 * @returns {Object} Map format {'A': 'explanation', 'B': 'explanation'}
 */
export const normalizeCorrectAnswers = (correctAnswers, options = []) => {
  if (!correctAnswers) return {};
  
  if (Array.isArray(correctAnswers)) {
    // Convert array to map with empty explanations
    const result = {};
    correctAnswers.forEach(label => {
      result[label] = '';
    });
    return result;
  }
  
  if (typeof correctAnswers === 'object') {
    return correctAnswers;
  }
  
  return {};
};