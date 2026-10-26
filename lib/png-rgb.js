const zlib=require('zlib');

const PNG_SIG=Buffer.from([137,80,78,71,13,10,26,10]);

function crc32(buf){
  let c=0xffffffff;
  for(const b of buf){
    c^=b;
    for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0);
  }
  return (c^0xffffffff)>>>0;
}

function chunk(type,data=Buffer.alloc(0)){
  const t=Buffer.from(type,'ascii');
  const out=Buffer.alloc(12+data.length);
  out.writeUInt32BE(data.length,0);
  t.copy(out,4);
  data.copy(out,8);
  out.writeUInt32BE(crc32(Buffer.concat([t,data])),8+data.length);
  return out;
}

function paeth(a,b,c){
  const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
  return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
}

function palettePngToRgb(input){
  const png=Buffer.isBuffer(input)?input:Buffer.from(input);
  if(!png.subarray(0,8).equals(PNG_SIG)) throw new Error('Invalid PNG');
  let off=8,width,height,bitDepth,colorType,palette=null,transparency=null;
  const idats=[];
  while(off<png.length){
    const len=png.readUInt32BE(off); const type=png.toString('ascii',off+4,off+8); const data=png.subarray(off+8,off+8+len); off+=12+len;
    if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];}
    else if(type==='PLTE') palette=data;
    else if(type==='tRNS') transparency=data;
    else if(type==='IDAT') idats.push(data);
    else if(type==='IEND') break;
  }
  if(bitDepth===8&&colorType===2) return png;
  if(bitDepth!==8||colorType!==3||!palette) throw new Error(`Expected 8-bit palette PNG, got bitDepth=${bitDepth}, colorType=${colorType}`);
  if(transparency&&Array.from(transparency).some(a=>a!==255)) throw new Error('Transparent palette entries are not supported for this icon');
  const packed=zlib.inflateSync(Buffer.concat(idats));
  const stride=width,bpp=1;
  const rows=[]; let pos=0,prev=Buffer.alloc(stride);
  for(let y=0;y<height;y++){
    const filter=packed[pos++]; const src=packed.subarray(pos,pos+stride); pos+=stride; const row=Buffer.alloc(stride);
    for(let x=0;x<stride;x++){
      const left=x>=bpp?row[x-bpp]:0, up=prev[x]||0, ul=x>=bpp?prev[x-bpp]||0:0;
      let v;
      if(filter===0)v=src[x];
      else if(filter===1)v=(src[x]+left)&255;
      else if(filter===2)v=(src[x]+up)&255;
      else if(filter===3)v=(src[x]+Math.floor((left+up)/2))&255;
      else if(filter===4)v=(src[x]+paeth(left,up,ul))&255;
      else throw new Error(`Unsupported PNG filter ${filter}`);
      row[x]=v;
    }
    rows.push(row); prev=row;
  }
  const raw=Buffer.alloc(height*(1+width*3)); pos=0;
  for(const row of rows){
    raw[pos++]=0;
    for(let x=0;x<width;x++){
      const i=row[x]*3;
      raw[pos++]=palette[i]; raw[pos++]=palette[i+1]; raw[pos++]=palette[i+2];
    }
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4); ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([PNG_SIG,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND')]);
}

module.exports={palettePngToRgb};
