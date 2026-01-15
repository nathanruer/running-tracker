/**
 * Capitalizes the first letter of a string
 * @param str - String to capitalize
 * @returns String with first letter capitalized
 * @example capitalize("hello") // "Hello"
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
