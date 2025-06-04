import Jimp from 'jimp';

export default async function handler(req, res) {
  const { date = '2025/06/04' } = req.query;

  try {
    // fetchを使ってbase.pngを読み込む
    const imageRes = await fetch('https://note-image-api-2.vercel.app/base.png');
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const image = await Jimp.read(buffer);

    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    image.print(font, 50, 400, `更新日: ${date}`);

    const finalBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    res.setHeader('Content-Type', 'image/png');
    res.send(finalBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('画像生成に失敗しました');
  }
}
