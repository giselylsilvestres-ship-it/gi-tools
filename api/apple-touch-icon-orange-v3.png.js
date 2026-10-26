const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const files = ['part0.txt','part1.txt','part2.txt','part3.txt','part4.txt','part5.txt','part6.txt','part7.txt'];

function buildOriginalIcon(){
  const base64 = files.map(name => fs.readFileSync(path.join(process.cwd(),'icon-source-orange-v1',name),'utf8').trim()).join('');
  return Buffer.from(base64,'base64');
}

function crc32(buf){
  let crc = 0xffffffff;
  for(const byte of buf){
    crc ^= byte;
    for(let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data){
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function tagSrgb(png){
  if(png.indexOf(Buffer.from('sRGB')) !== -1) return png;
  const ihdrLength = png.readUInt32BE(8);
  const insertAt = 8 + 4 + 4 + ihdrLength + 4;
  const srgb = pngChunk('sRGB', Buffer.from([0]));
  return Buffer.concat([png.subarray(0, insertAt), srgb, png.subarray(insertAt)]);
}

module.exports = (req,res) => {
  try {
    const original = buildOriginalIcon();
    const originalSha1 = crypto.createHash('sha1').update(original).digest('hex');
    const originalValid = original.length === 23178 && originalSha1 === '47673f5a207a8bc6dec10941756742867c32bf1e' && original.subarray(0,8).toString('hex') === '89504e470d0a1a0a';
    if(!originalValid){
      res.setHeader('Cache-Control','no-store');
      return res.status(500).json({error:'orange source integrity check failed',bytes:original.length,sha1:originalSha1});
    }

    const png = tagSrgb(original);
    const sha1 = crypto.createHash('sha1').update(png).digest('hex');
    const valid = png.length === 23191 && png.indexOf(Buffer.from('sRGB')) !== -1;
    if(!valid){
      res.setHeader('Cache-Control','no-store');
      return res.status(500).json({error:'sRGB icon build failed',bytes:png.length,sha1});
    }

    res.setHeader('Content-Type','image/png');
    res.setHeader('Content-Length',String(png.length));
    res.setHeader('X-Icon-SHA1',sha1);
    res.setHeader('X-Icon-Color-Space','sRGB');
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    return res.status(200).send(png);
  } catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(500).json({error:error.message});
  }
};
