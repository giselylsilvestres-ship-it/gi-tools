const crypto=require('crypto');
const parts=[0,1,2,3,4,5].map(i=>require(`../lib/touch-icon-part-${i}.js`));
const png=Buffer.from(parts.join(''),'base64');

module.exports=(req,res)=>{
  const signature=png.subarray(0,8).toString('hex');
  const width=png.readUInt32BE(16);
  const height=png.readUInt32BE(20);
  const bitDepth=png[24];
  const colorType=png[25];
  const sha1=crypto.createHash('sha1').update(png).digest('hex');
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({signature,width,height,bitDepth,colorType,bytes:png.length,sha1});
};
