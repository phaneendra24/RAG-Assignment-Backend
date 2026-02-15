export const processAndCleanTextInput = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.normalize('NFKC');

  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');

  cleaned = cleaned.replace(/\r\n?/g, '\n');

  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  cleaned = cleaned
    .split('\n')
    .filter((line) => {
      if (!line) return false;
      const hasAlphaNumeric = /[a-zA-Z0-9]/.test(line);
      return hasAlphaNumeric;
    })
    .join('\n');

  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  cleaned = cleaned.replace(/\n{2,}/g, '\n\n');

  cleaned = cleaned.trim();

  const MIN_LENGTH = 10;
  if (cleaned.length < MIN_LENGTH) return '';

  return cleaned;
};
