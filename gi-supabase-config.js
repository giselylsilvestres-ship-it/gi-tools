window.GI_SUPABASE_URL='https://huiuuhzsfmfptifxievv.supabase.co';
window.GI_SUPABASE_KEY='sb_publishable_yyxXVmNC6Wb42KMT5eTjrQ_3C6trYzw';

(() => {
  const iconHref = '/apple-touch-icon-orange-v2.png';
  const manifestHref = '/manifest.webmanifest';
  const tags = [
    `<link rel="manifest" href="${manifestHref}">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${iconHref}">`,
    `<link rel="apple-touch-icon-precomposed" sizes="180x180" href="${iconHref}">`,
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="Gica Tools">',
    '<meta name="mobile-web-app-capable" content="yes">'
  ].join('');

  // While the browser is still parsing <head>, inject these as parser-time tags.
  // This is more reliable for iOS Home Screen icon discovery than adding them after load.
  if (document.readyState === 'loading') {
    document.write(tags);
    return;
  }

  // Fallback for any page that loads this file after parsing has finished.
  const head = document.head || document.documentElement;
  const ensureLink = (rel, href, sizes) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      head.appendChild(el);
    }
    el.href = href;
    if (sizes) el.sizes = sizes;
  };
  const ensureMeta = (name, content) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      head.appendChild(el);
    }
    el.content = content;
  };

  ensureLink('manifest', manifestHref);
  ensureLink('apple-touch-icon', iconHref, '180x180');
  ensureLink('apple-touch-icon-precomposed', iconHref, '180x180');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-title', 'Gica Tools');
  ensureMeta('mobile-web-app-capable', 'yes');
})();
