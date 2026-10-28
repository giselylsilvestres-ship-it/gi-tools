module.exports = (req, res) => { res.setHeader('Cache-Control', 'no-store'); return res.redirect(307, '/icons/gica-home-v3-180.png'); };
