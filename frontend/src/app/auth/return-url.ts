/** Only same-app paths are allowed as a post-login destination (no `//evil.com` or absolute URLs). */
export function safeReturnUrl(value: string | undefined | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/';
}
