const results = document.querySelector('#guest-results');

if (results) {
  let lastSignature = '';
  const observer = new MutationObserver(() => {
    const signature = results.textContent?.trim() || '';
    if (!signature || signature === lastSignature) return;
    lastSignature = signature;

    requestAnimationFrame(() => {
      const firstResult = results.querySelector('.guest-result');
      const target = firstResult || results;
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  });

  observer.observe(results, { childList: true, subtree: true, characterData: true });
}
