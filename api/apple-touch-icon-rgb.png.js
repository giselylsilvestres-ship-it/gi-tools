const path=require('path');
const {palettePngToRgb}=require('../lib/png-rgb');

module.exports=(req,res)=>{
  try{
    const file=path.join(process.cwd(),'apple-touch-icon-gica-20261026.png');
    const png=palettePngToRgb(file);
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('Content-Length',String(png.length));
    res.status(200).send(png);
  }catch(err){
    console.error(err);
    res.status(500).send('icon conversion failed');
  }
};
