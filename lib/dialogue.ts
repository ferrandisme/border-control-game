export const sanitizeDialogueText = (text: string): string => {
  return text
    .replace(/<\|[^|]+\|>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[—–―][^—–―\n]{0,180}[—–―]/g, ' ')
    .replace(/[—–―]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const truncateAtWordBoundary = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength + 1);
  const boundary = truncated.lastIndexOf(' ');
  return (boundary > Math.floor(maxLength * 0.6) ? truncated.slice(0, boundary) : truncated.slice(0, maxLength)).trim();
};
