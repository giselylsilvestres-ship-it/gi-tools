const {palettePngToRgb}=require('../lib/png-rgb');

module.exports=async(req,res)=>{
  try{
    const proto=req.headers['x-forwarded-proto']||'https';
    const host=req.headers.host;
    const source=`${proto}://${host}/apple-touch-icon-gica-20261026.png`;
    const response=await fetch(source,{cache:'no-store'});
    if(!response.ok) throw new Error(`source icon ${response.status}`);
    const png=palettePngToRgb(Buffer.from(await response.arrayBuffer()));
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('Content-Length',String(png.length));
    res.status(200).send(png);
  }catch(err){
    console.error(err);
    res.status(500).send('icon conversion failed');
  }
};
