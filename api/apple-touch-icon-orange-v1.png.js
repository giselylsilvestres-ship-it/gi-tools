const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const files = ['part0.txt','part1.txt','part2.txt','part3.txt','part4.txt','part5.txt','part6.txt','part7.txt'];

function buildIcon(){
  const base64 = files.map(name => fs.readFileSync(path.join(process.cwd(),'icon-source-orange-v1',name),'utf8').trim()).join('');
  return Buffer.from(base64,'base64');
}

module.exports = (req,res) => {
  try {
    const png = buildIcon();
    const sha1 = crypto.createHash('sha1').update(png).digest('hex');
    const valid = png.length === 23178 && sha1 === '47673f5a207a8bc6dec10941756742867c32bf1e' && png.subarray(0,8).toString('hex') === '89504e470d0a1a0a';
    if(!valid){
      res.setHeader('Cache-Control','no-store');
      return res.status(500).json({error:'orange touch icon integrity check failed',bytes:png.length,sha1});
    }
    res.setHeader('Content-Type','image/png');
    res.setHeader('Content-Length',String(png.length));
    res.setHeader('X-Icon-SHA1',sha1);
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    return res.status(200).send(png);
  } catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(500).json({error:error.message});
  }
};
