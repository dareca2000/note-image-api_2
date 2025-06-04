import Jimp from 'jimp';

// ベース画像のキャッシュ用
let cachedBaseImage = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export default async function handler(req, res) {
  // HTTPメソッドの制限
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date = '2025/06/04' } = req.query;

  try {
    // 日付形式の検証
    if (!isValidDate(date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY/MM/DD format.' 
      });
    }

    // ベース画像の取得（キャッシュ機能付き）
    const baseImage = await getBaseImage();
    
    // 画像のクローンを作成（元画像を保護）
    const image = baseImage.clone();
    
    // フォントの読み込み
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    
    // 画像サイズを取得して適切な位置を計算
    const imageWidth = image.getWidth();
    const imageHeight = image.getHeight();
    
    // 日付テキストの設定
    const dateText = `更新日: ${date}`;
    
    // テキストサイズを測定して中央寄せまたは適切な位置に配置
    const textWidth = Jimp.measureText(font, dateText);
    const textHeight = Jimp.measureTextHeight(font, dateText);
    
    // 位置の計算（左下に配置、マージンを考慮）
    const margin = 20;
    const x = margin;
    const y = imageHeight - textHeight - margin;
    
    // テキストを画像に追加
    image.print(font, x, y, dateText);
    
    // 最終的な画像バッファを生成
    const finalBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    
    // レスポンスヘッダーの設定
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ
    res.setHeader('Content-Length', finalBuffer.length);
    
    // 画像を送信
    res.send(finalBuffer);
    
  } catch (error) {
    console.error('Image generation error:', error);
    
    // エラーの種類に応じてレスポンスを分ける
    if (error.message.includes('fetch')) {
      return res.status(503).json({ 
        error: 'External service unavailable' 
      });
    }
    
    if (error.message.includes('font') || error.message.includes('Jimp')) {
      return res.status(500).json({ 
        error: 'Image processing failed' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}

/**
 * 日付形式の検証
 * @param {string} dateString - 検証する日付文字列
 * @returns {boolean} - 有効な日付形式かどうか
 */
function isValidDate(dateString) {
  // 基本的な形式チェック
  const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  // 実際の日付として有効かチェック
  const [year, month, day] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * ベース画像の取得（キャッシュ機能付き）
 * @returns {Promise<Jimp>} - Jimpオブジェクト
 */
async function getBaseImage() {
  const now = Date.now();
  
  // キャッシュが有効かチェック
  if (cachedBaseImage && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedBaseImage.clone();
  }
  
  try {
    // 外部画像を取得
    const imageRes = await fetch('https://note-image-api-2.vercel.app/base.png', {
      timeout: 10000 // 10秒タイムアウト
    });
    
    if (!imageRes.ok) {
      throw new Error(`HTTP error! status: ${imageRes.status}`);
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const image = await Jimp.read(buffer);
    
    // キャッシュに保存
    cachedBaseImage = image.clone();
    cacheTimestamp = now;
    
    return image;
    
  } catch (error) {
    // フォールバック: 単色の画像を生成
    console.warn('Failed to fetch base image, using fallback:', error.message);
    
    const fallbackImage = new Jimp(800, 600, '#f0f0f0');
    
    // キャッシュに保存（短時間のみ）
    cachedBaseImage = fallbackImage.clone();
    cacheTimestamp = now;
    
    return fallbackImage;
  }
}

/**
 * 日付に応じたフォントサイズの調整（オプション機能）
 * @param {string} text - テキスト
 * @param {number} maxWidth - 最大幅
 * @returns {string} - フォント定数
 */
function getOptimalFont(text, maxWidth) {
  const fonts = [
    { font: Jimp.FONT_SANS_64_BLACK, size: 64 },
    { font: Jimp.FONT_SANS_32_BLACK, size: 32 },
    { font: Jimp.FONT_SANS_16_BLACK, size: 16 }
  ];
  
  for (const fontConfig of fonts) {
    const textWidth = Jimp.measureText(fontConfig.font, text);
    if (textWidth <= maxWidth) {
      return fontConfig.font;
    }
  }
  
  return Jimp.FONT_SANS_16_BLACK; // 最小フォント
}
