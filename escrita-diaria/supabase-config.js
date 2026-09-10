window.ESCRITA_SUPABASE_URL='https://huiuuhzsfmfptifxievv.supabase.co';
window.ESCRITA_SUPABASE_KEY='sb_publishable_yyxXVmNC6Wb42KMT5eTjrQ_3C6trYzw';
(()=>{const c=supabase.createClient(window.ESCRITA_SUPABASE_URL,window.ESCRITA_SUPABASE_KEY);c.auth.getSession().then(({data})=>{if(!data.session)location.replace('/?next='+encodeURIComponent(location.pathname));});})();
