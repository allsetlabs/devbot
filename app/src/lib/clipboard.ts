function fallbackCopy(text: string): void {
  const input = document.createElement('input');
  input.value = text;
  input.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  input.setAttribute('readonly', '');
  document.body.appendChild(input);
  input.focus();
  input.setSelectionRange(0, text.length);
  document.execCommand('copy');
  document.body.removeChild(input);
}

export function copyToClipboard(text: string): void {
  if (navigator.clipboard) {
    // Initiate within the user-gesture tick; don't await so we don't defer past it
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    return;
  }
  fallbackCopy(text);
}
