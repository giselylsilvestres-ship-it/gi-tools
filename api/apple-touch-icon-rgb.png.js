const parts=[
  require('../lib/touch-icon-part-0'),
  require('../lib/touch-icon-part-1'),
  require('../lib/touch-icon-part-2'),
  require('../lib/touch-icon-part-3'),
  require('../lib/touch-icon-part-4'),
  require('../lib/touch-icon-part-5'),
];

const png=Buffer.from(parts.join(''),'base64');

module.exports=(req,res)=>{
  res.setHeader('Content-Type','image/png');
  res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
  res.setHeader('Content-Length',String(png.length));
  res.status(200).send(png);
};
