window.GI_SUPABASE_URL='https://huiuuhzsfmfptifxievv.supabase.co';
window.GI_SUPABASE_KEY='sb_publishable_yyxXVmNC6Wb42KMT5eTjrQ_3C6trYzw';

(() => {
  const head = document.head || document.documentElement;
  const iconHref = '/apple-touch-icon-orange-v2.png';

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

  ensureLink('manifest', '/manifest.webmanifest');
  ensureLink('apple-touch-icon', iconHref, '180x180');
  ensureLink('apple-touch-icon-precomposed', iconHref, '180x180');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-title', 'Gica Tools');
  ensureMeta('mobile-web-app-capable', 'yes');
})();
