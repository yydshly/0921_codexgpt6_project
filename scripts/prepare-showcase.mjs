import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const destination=path.join(root,'moon-studio/public/showcase');
const files={
 'film-artwork-envelope.png':'midautumn-film/assets/envelope.png',
 'film-artwork-father.png':'midautumn-film/assets/father.png',
 'film-artwork-child.png':'midautumn-film/assets/child.png',
 'film-artwork-mother.png':'midautumn-film/assets/mother.png',
 'film-artwork-family.png':'midautumn-film/assets/family.png',
 'film-artwork-stilllife.png':'midautumn-film/assets/stilllife.png',
 'film.mp4':'midautumn-film/output/这一家-中秋样片.mp4',
 'film-cover.jpg':'midautumn-film/output/cover-landscape.jpg',
 'film-captions.srt':'midautumn-film/output/captions.srt',
 'film-narration.mp3':'midautumn-film/output/合成旁白.mp3',
 'film-music.wav':'midautumn-film/output/原创氛围配乐.wav',
 'film-poster.png':'midautumn-film/output/分享封面.png',
 'film-frames.jpg':'midautumn-film/output/contact-sheet.jpg',
 'film-delivery.zip':'midautumn-film/output/这一家-中秋样片交付包.zip',
 'docs/product-understanding.md':'docs/PRODUCT_UNDERSTANDING.md',
 'docs/asset-catalog.md':'docs/ASSET_CATALOG.md',
 'docs/capability-analysis.md':'中秋产品高级感能力分析.md',
 'docs/product-directions.md':'中秋共创产品方向.md',
 'docs/asset-provenance.md':'moon-studio/design/asset-provenance.md',
 'docs/film-prompts.md':'midautumn-film/image-prompts.md',
 'docs/film-readme.md':'midautumn-film/README.md',
};
for(const [to,from] of Object.entries(files)){
 const output=path.join(destination,to);await mkdir(path.dirname(output),{recursive:true});
 await copyFile(path.join(root,from),output);
}
await writeFile(path.join(destination,'manifest.json'),JSON.stringify({version:1,assets:Object.entries(files).map(([url,source])=>({url,source}))},null,2)+'\n');
console.log(`Prepared ${Object.keys(files).length} showcase assets and documents.`);
