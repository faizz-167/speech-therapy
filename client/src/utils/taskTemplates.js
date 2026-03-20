export const CHILD_TASKS = [
  { id: 'c1', type: 'word_repetition', title: 'Say "Apple"', expectedText: 'Apple' },
  { id: 'c2', type: 'word_repetition', title: 'Say "Banana"', expectedText: 'Banana' },
  { id: 'c3', type: 'sentence_reading', title: 'Read: "The cat sat."', expectedText: 'The cat sat.' },
  // ... adding a few samples, backend has the full 60
];

export const ADULT_TASKS = [
  { id: 'a1', type: 'word_repetition', title: 'Say "Articulate"', expectedText: 'Articulate' },
  { id: 'a2', type: 'sentence_reading', title: 'Read: "The quick brown fox jumps."', expectedText: 'The quick brown fox jumps.' },
  { id: 'a3', type: 'conversation', title: 'Describe your day', expectedText: '' },
];
