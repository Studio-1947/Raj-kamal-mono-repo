import { useState, useEffect } from 'react';

export interface FuzzyMatchResult {
  matches: boolean;
  score: number;
}

/**
 * High-performance fuzzy matching algorithm.
 * Evaluates candidate strings against a query and returns a match result and relevance score.
 * Matches are prioritized as: Exact > Acronym > Prefix Word Start > Substring > Subsequence (fuzzy).
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatchResult {
  if (!query) return { matches: true, score: 0 };
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // 1. Exact Match (Highest priority)
  if (textLower === queryLower) {
    return { matches: true, score: 1000 };
  }

  // 2. Acronym Match (e.g. query "rk" matching "Raj Kamal")
  const words = textLower.split(/[\s()\-]+/);
  if (queryLower.length > 1 && words.length > 1) {
    const acronym = words.map(w => w.charAt(0)).join('');
    if (acronym.startsWith(queryLower)) {
      return { matches: true, score: 900 };
    }
  }

  // 3. Exact Substring Match
  const index = textLower.indexOf(queryLower);
  if (index !== -1) {
    const isWordStart = index === 0 || textLower.charAt(index - 1) === ' ' || textLower.charAt(index - 1) === '(' || textLower.charAt(index - 1) === '-';
    const score = isWordStart ? 800 - index : 500 - index;
    return { matches: true, score };
  }

  // 4. Word boundary prefix matches (multi-word queries)
  const queryWords = queryLower.split(/\s+/).filter(Boolean);
  if (queryWords.length > 1 && words.length > 0) {
    let allMatched = true;
    let totalScore = 400;
    for (const qWord of queryWords) {
      let wordMatched = false;
      for (let i = 0; i < words.length; i++) {
        if (words[i].startsWith(qWord)) {
          wordMatched = true;
          totalScore -= i; // Prioritize matching earlier words
          break;
        }
      }
      if (!wordMatched) {
        allMatched = false;
        break;
      }
    }
    if (allMatched) {
      return { matches: true, score: totalScore };
    }
  }

  // 5. Character subsequence match (for typo tolerance/approx matches)
  // Required to be at least 2 characters to avoid single-letter noise
  if (queryLower.length >= 2) {
    let queryIdx = 0;
    let textIdx = 0;
    let distance = 0;
    let lastMatchIdx = -1;

    while (queryIdx < queryLower.length && textIdx < textLower.length) {
      if (queryLower.charAt(queryIdx) === textLower.charAt(textIdx)) {
        if (lastMatchIdx !== -1) {
          distance += (textIdx - lastMatchIdx - 1);
        }
        lastMatchIdx = textIdx;
        queryIdx++;
      }
      textIdx++;
    }

    if (queryIdx === queryLower.length) {
      // Penalty based on distance and how far back the match is
      const score = Math.max(10, 200 - distance - lastMatchIdx);
      return { matches: true, score };
    }
  }

  return { matches: false, score: 0 };
}

/**
 * React hook to debounce changes to a state value.
 * Instantly updates if the input value is cleared or is empty to prevent UI delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      setDebouncedValue(value);
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Standard utility function for debouncing execution of functions.
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T & { cancel?: () => void } {
  let timeout: any;
  const debounced = function (this: any, ...args: any[]) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  } as any;
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  return debounced;
}
