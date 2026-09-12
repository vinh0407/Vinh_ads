import { Product } from '@/types';

export interface MatchedProductResult {
  product: Product;
  affiliateUrl: string;
  matchScore: number;
  matchReason: string;
}

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "Ăn Uống & Giấy Ăn": [
    "ăn uống", "đồ ăn", "món ăn", "bữa ăn", "nấu nướng", "nhà hàng", "quán ăn", "bàn ăn",
    "ăn vặt", "bánh", "kẹo", "trà sữa", "đồ ngọt", "sốt", "nhiệt", "pha chế", "tiêu hóa",
    "giấy", "khăn giấy", "giấy ăn", "topgia", "top gia", "pio", "bịch", "rút", "thùng"
  ],
  "Mỹ Phẩm & Skincare": [
    "sữa tắm", "lifebuoy", "detox", "tẩy tế bào", "tẩy da", "dove", "serum", "torriden",
    "son", "skincare", "da mặt", "mụn", "chống nắng", "sấy tóc", "ion", "dưỡng ẩm",
    "mỹ phẩm", "khô môi", "thơm", "xịt thơm", "bàn chải", "răng"
  ],
  "Xe Cộ & Đồ Dùng Phượt": [
    "xe cộ", "xe máy", "xe đạp", "phượt", "đường phố", "di chuyển", "đi xe", "giao thông",
    "chạy xe", "shipper", "motowolf", "lamicall", "kẹp xe", "ghi đông", "chân kính", "chống rung",
    "giá đỡ xe máy", "kẹp điện thoại xe máy"
  ],
  "Điện Tử & Bàn Học Workstation": [
    "quạt", "goojodoq", "năng lượng mặt trời", "turbo", "bàn học", "học tập", "làm việc",
    "tai nghe", "bluetooth", "pin", "sạc", "máy tính", "laptop", "smartwatch", "đồng hồ"
  ],
  "Thời Trang & Phụ Kiện": [
    "áo", "quần", "váy", "đầm", "byjane", "thắt eo", "body", "thun", "outfit", "headband",
    "giày", "dép", "balo", "túi", "phụ kiện", "khăn", "mũ", "nón", "handmade"
  ]
};

export function matchProductToContent(
  content: string,
  products: Product[]
): MatchedProductResult | null {
  if (!products || products.length === 0) return null;
  if (!content) {
    const prod = products[0];
    return {
      product: prod,
      affiliateUrl: prod.affiliateLinks?.[0]?.affiliateUrl || prod.shopeeUrl || '',
      matchScore: 0,
      matchReason: 'Fallback mặc định',
    };
  }

  const normalizedContent = content.toLowerCase();

  let bestProduct: Product = products[0];
  let maxScore = -1;
  let bestReason = 'Tự động ghép sản phẩm phù hợp';

  for (const prod of products) {
    let score = 0;
    let currentReason = '';
    const prodName = prod.name.toLowerCase();
    const prodDesc = (prod.description || '').toLowerCase();
    const prodCat = (prod.category || '').toLowerCase();

    // 1. Direct Keyword Matching
    const words = prodName
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !['cho', 'của', 'với', 'loại', 'thùng', 'bịch', 'combo'].includes(w));

    for (const kw of words) {
      if (normalizedContent.includes(kw)) {
        score += 15;
        currentReason = "Khớp từ khóa [" + kw + "] trong tên sản phẩm \"" + prod.name.slice(0, 25) + "...\"";
      }
    }

    // 2. Domain / Topic Intent Matching
    for (const [domainName, domainKws] of Object.entries(DOMAIN_KEYWORDS)) {
      const isContentInDomain = domainKws.some((kw) => normalizedContent.includes(kw));
      const isProductInDomain = domainKws.some(
        (kw) => prodName.includes(kw) || prodDesc.includes(kw) || prodCat.includes(kw)
      );

      if (isContentInDomain && isProductInDomain) {
        score += 25;
        if (!currentReason) {
          currentReason = "Khớp ngữ cảnh chủ đề [" + domainName + "]";
        }
      }
    }

    // 3. Brand Name Matching
    const brands = ['topgia', 'top gia', 'goojodoq', 'dove', 'lifebuoy', 'torriden', 'motowolf', 'lamicall', 'tanzy', 'byjane', 'pio'];
    for (const brand of brands) {
      if (normalizedContent.includes(brand) && prodName.includes(brand)) {
        score += 40;
        currentReason = "Khớp thương hiệu [" + brand.toUpperCase() + "] trong bài viết";
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestProduct = prod;
      bestReason = currentReason || ("Khớp danh mục [" + (prod.category || 'Tổng hợp') + "]");
    }
  }

  const affUrl = bestProduct.affiliateLinks?.[0]?.affiliateUrl || bestProduct.shopeeUrl || '';

  return {
    product: bestProduct,
    affiliateUrl: affUrl,
    matchScore: maxScore,
    matchReason: bestReason,
  };
}


export function stripHashtags(text: string): string {
  if (!text) return '';
  return text
    .replace(/#[^\s#]+/gi, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

export function getMultipleMatchedProducts(
  content: string,
  products: Product[],
  count = 3
): { product: Product; affiliateUrl: string; commentText: string }[] {
  if (!products || products.length === 0) return [];
  const normalizedContent = (content || '').toLowerCase();

  const scoredProducts = products.map((prod) => {
    let score = 0;
    const prodName = prod.name.toLowerCase();
    const words = prodName.split(/\s+/).filter((w) => w.length >= 3);
    for (const w of words) {
      if (normalizedContent.includes(w)) score += 10;
    }
    return { prod, score };
  });

  scoredProducts.sort((a, b) => b.score - a.score);

  const selected = scoredProducts.slice(0, Math.min(count, products.length));

  return selected.map((item) => {
    const p = item.prod;
    const aff = p.affiliateLinks?.[0]?.affiliateUrl || p.shopeeUrl || '';
    return {
      product: p,
      affiliateUrl: aff,
      commentText: "👉 Link mua " + p.name + " chính hãng [Ưu đãi hôm nay]: " + aff + " ⚡",
    };
  });
}
