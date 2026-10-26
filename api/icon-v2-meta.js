const crypto=require('crypto');
const zlib=require('zlib');
const parts=[0,1,2,3,4,5].map(i=>require(`../lib/touch-icon-part-${i}.js`));
const png=Buffer.from(parts.join(''),'base64');

function paeth(a,b,c){
  const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
  return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
}

function rawRgbPixels(buf,width,height){
  let off=8; const idats=[];
  while(off<buf.length){
    const len=buf.readUInt32BE(off); const type=buf.toString('ascii',off+4,off+8);
    const data=buf.subarray(off+8,off+8+len); off+=12+len;
    if(type==='IDAT') idats.push(data);
    if(type==='IEND') break;
  }
  const packed=zlib.inflateSync(Buffer.concat(idats));
  const stride=width*3,bpp=3; const pixels=Buffer.alloc(width*height*3);
  let pos=0,out=0,prev=Buffer.alloc(stride);
  for(let y=0;y<height;y++){
    const filter=packed[pos++]; const src=packed.subarray(pos,pos+stride); pos+=stride;
    const row=Buffer.alloc(stride);
    for(let x=0;x<stride;x++){
      const left=x>=bpp?row[x-bpp]:0,up=prev[x]||0,ul=x>=bpp?prev[x-bpp]||0:0;
      if(filter===0) row[x]=src[x];
      else if(filter===1) row[x]=(src[x]+left)&255;
      else if(filter===2) row[x]=(src[x]+up)&255;
      else if(filter===3) row[x]=(src[x]+Math.floor((left+up)/2))&255;
      else if(filter===4) row[x]=(src[x]+paeth(left,up,ul))&255;
      else throw new Error(`unsupported filter ${filter}`);
    }
    row.copy(pixels,out); out+=stride; prev=row;
  }
  return pixels;
}

module.exports=(req,res)=>{
  try{
    const signature=png.subarray(0,8).toString('hex');
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20),bitDepth=png[24],colorType=png[25];
    const sha1=crypto.createHash('sha1').update(png).digest('hex');
    const pixels=rawRgbPixels(png,width,height);
    const pixelSha1=crypto.createHash('sha1').update(pixels).digest('hex');
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({signature,width,height,bitDepth,colorType,bytes:png.length,sha1,pixelBytes:pixels.length,pixelSha1});
  }catch(err){
    return res.status(500).json({error:String(err&&err.message||err)});
  }
};
