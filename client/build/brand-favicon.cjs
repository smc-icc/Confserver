'use strict';
const fs=require('node:fs'),path=require('node:path');
const VERSION='20261020';
const LINKS=`<link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48" href="/static/brand/favicon-${VERSION}.ico"><link rel="icon" type="image/svg+xml" href="/static/brand/favicon-${VERSION}.svg">`;
function brandHtml(html){
 if(!/<\/head\s*>/i.test(html))throw Error('ConfServer HTML entry is missing its head');
 const without=html.replace(/<link\b(?=[^>]*\brel\s*=\s*["'][^"']*\bicon\b[^"']*["'])[^>]*>\s*/gi,'');
 return without.replace(/<\/head\s*>/i,LINKS+'</head>');
}
class BrandFaviconPlugin{
 apply(compiler){
  const HtmlWebpackPlugin=require('html-webpack-plugin');
  compiler.hooks.compilation.tap('ConfServerBrandFavicon',compilation=>{
   HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap('ConfServerBrandFavicon',data=>{data.html=brandHtml(data.html);return data});
  });
 }
}
BrandFaviconPlugin.brandHtml=brandHtml;
module.exports=BrandFaviconPlugin;
// Use the same transformation when layering onto an existing release image.
// Existing JS/CSS bundles stay byte-for-byte identical.
if(require.main===module){
 const args=process.argv.slice(2),dist=args[args.indexOf('--dist')+1],assets=args[args.indexOf('--assets')+1];
 if(!args.includes('--dist')||!args.includes('--assets')||!dist||!assets)throw Error('--dist and --assets are required');
 const target=path.resolve(dist),source=path.resolve(assets);
 const pages=fs.readdirSync(target).filter(name=>name.endsWith('.html'));
 if(!pages.includes('login.html')||!pages.includes('tars.html'))throw Error('Unexpected ConfServer dist directory');
 const edits=pages.map(name=>{const file=path.join(target,name);return {file,html:brandHtml(fs.readFileSync(file,'utf8'))}});
 for(const ext of ['ico','svg'])if(!fs.statSync(path.join(source,`favicon-${VERSION}.${ext}`)).isFile())throw Error('Missing brand favicon asset');
 fs.mkdirSync(path.join(target,'static/brand'),{recursive:true});
 for(const ext of ['ico','svg']){
  const from=path.join(source,`favicon-${VERSION}.${ext}`);fs.copyFileSync(from,path.join(target,'static/brand',path.basename(from)));fs.copyFileSync(from,path.join(target,`favicon.${ext}`));
 }
 for(const edit of edits)fs.writeFileSync(edit.file,edit.html);
 console.log(JSON.stringify({brandedEntryPages:pages,iconPath:`/static/brand/favicon-${VERSION}.ico`}));
}
