function execCommandCopy(text: string): boolean {
  // Use textarea — more reliable than input on iOS Safari
  const el = document.createElement('textarea');
  el.value = text;
  // Off-screen but visible (opacity:0 can cause execCommand to silently fail on some mobile browsers)
  el.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;font-size:16px;border:none;outline:none';
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('tabindex', '-1');
  // Prevent iOS from scrolling to the element
  el.setAttribute('readonly', '');
  document.body.appendChild(el);
  el.focus();
  // iOS requires both select() and setSelectionRange
  el.select();
  el.setSelectionRange(0, text.length);
  // Remove readonly so execCommand can actually copy the selection
  el.removeAttribute('readonly');
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  return ok;
}

export function copyToClipboard(text: string): void {
  // Clipboard API only works on HTTPS / localhost — skip on plain HTTP (local network)
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
    return;
  }
  execCommandCopy(text);
}
