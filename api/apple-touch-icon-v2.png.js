const crypto=require('crypto');
const parts=[0,1,2,3,4,5].map(i=>require(`../lib/touch-icon-part-${i}.js`));
const png=Buffer.from(parts.join(''),'base64');

module.exports=(req,res)=>{
  res.setHeader('Content-Type','image/png');
  res.setHeader('Cache-Control','public, max-age=31536000, immutable');
  res.setHeader('Content-Length',String(png.length));
  res.setHeader('ETag',`"${crypto.createHash('sha1').update(png).digest('hex')}"`);
  return res.status(200).send(png);
};
