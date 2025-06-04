import Jimp from 'jimp';

export default async function handler(req, res) {
  const { date = '2025/06/04' } = req.query;

  try {
    const image = await Jimp.read('./public/base.png');
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    image.print(font, 50, 400, `更新日: ${date}`);

    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('画像生成に失敗しました');
  }
}
