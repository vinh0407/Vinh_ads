"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Thumbnail } from "@/components/ui/Thumbnail";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { productsApi } from "@/lib/api";
import { AffiliateNetwork, Product } from "@/types";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Sparkles,
  Loader2,
  LayoutGrid,
  List,
  Film,
  Copy,
  ExternalLink,
  Check,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Filter,
  Tag,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Textarea } from "@/components/ui/Textarea";
import toast from "react-hot-toast";
import { USER_AI_PROMPT_TEMPLATE } from "@/lib/prompt-templates";
import { formatCurrency } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  description: z.string().optional(),
  shopeeUrl: z.string().min(1, "Vui lòng nhập link Shopee"),
  affiliateUrl: z.string().optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
  price: z.number().min(0, "Giá phải lớn hơn hoặc bằng 0"),
  currency: z.string().default("VND"),
  category: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;



function getImageForProduct(name: string, code = ''): string {
  const n = name.toLowerCase();
  if (n.includes('quạt') && n.includes('mặt trời')) return 'https://images.unsplash.com/photo-1618941716939-553df3c6c276?w=600&q=80';
  if (n.includes('quạt') && n.includes('gấp')) return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80';
  if (n.includes('quạt') || n.includes('turbo')) return 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=600&q=80';
  if (n.includes('motowolf') || n.includes('mdl2827d')) return 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=80';
  if (n.includes('lamicall') || n.includes('chống sốc')) return 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&q=80';
  if (n.includes('tayo') || n.includes('xe đạp')) return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80';
  if (n.includes('giá đỡ') || n.includes('kẹp')) return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&q=80';
  if (n.includes('topgia') && n.includes('treo tường')) return 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=600&q=80';
  if (n.includes('topgia') && (n.includes('30 gói') || n.includes('thùng'))) return 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80';
  if (n.includes('pio') || n.includes('khăn giấy') || n.includes('giấy')) return 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&q=80';
  if (n.includes('torriden') || n.includes('serum')) return 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80';
  if (n.includes('dove') || n.includes('tẩy tế bào') || n.includes('tẩy da')) return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80';
  if (n.includes('lifebuoy') || n.includes('sữa tắm')) return 'https://images.unsplash.com/photo-1608248597261-e97d747f7b60?w=600&q=80';
  if (n.includes('byjane') || n.includes('áo thun')) return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80';
  if (n.includes('headband') || n.includes('velcro') || n.includes('dán đầu')) return 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&q=80';
  if (n.includes('tanzy') || n.includes('xốt phô mai') || n.includes('sốt')) return 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=600&q=80';
  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
}

const INITIAL_SHOPEE_CSV_PRODUCTS: Product[] = [
  {
    "id": "prod_csv_23552060269",
    "name": "Giấy vệ sinh treo tường TopGia đa sắc đa năng từ bột giấy thiên nhiên, 1280tờ/4lớp",
    "description": "Cửa hàng: TopGia HCM Store · Mã SP: 23552060269",
    "shopeeUrl": "https://shopee.vn/product/1016604648/23552060269",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mswt4wo4mo7408",
    "price": 125000,
    "currency": "VND",
    "category": "Học Tập & Sách Vở",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.850Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_23552060269",
        "productId": "prod_csv_23552060269",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1016604648/23552060269",
        "affiliateUrl": "https://s.shopee.vn/20vP3ezpcD",
        "shortCode": "shopee-23552060269",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_43066009946",
    "name": "GOOJODOQ Quạt năng lượng mặt trời  Mini có thể gập lại 3600 mAh Turbo Jet có thể sạc lại cầm tay Gió mạnh GFS014",
    "description": "Cửa hàng: Goojodoq Offical Shop.VN · Mã SP: 43066009946",
    "shopeeUrl": "https://shopee.vn/product/1053077389/43066009946",
    "imageUrl": "https://down-vn.img.susercontent.com/file/cn-11134207-820l4-me6yhcc3pvra51",
    "price": 269000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_43066009946",
        "productId": "prod_csv_43066009946",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1053077389/43066009946",
        "affiliateUrl": "https://s.shopee.vn/2VrfeZxvbK",
        "shortCode": "shopee-43066009946",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_46917524454",
    "name": "Giá đỡ điện thoại chống sốc cho xe máy Lắp đặt không cần tháo gương chiếu hậu Xoay 360° Khóa một chạm",
    "description": "Cửa hàng: LAMICALL · Mã SP: 46917524454",
    "shopeeUrl": "https://shopee.vn/product/1637689805/46917524454",
    "imageUrl": "https://down-vn.img.susercontent.com/file/sg-11134201-82588-msto75havytd60",
    "price": 68000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_46917524454",
        "productId": "prod_csv_46917524454",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1637689805/46917524454",
        "affiliateUrl": "https://s.shopee.vn/2LYFSGyYwJ",
        "shortCode": "shopee-46917524454",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_52160607095",
    "name": "Hàn Quốc Dính Dán Đầu Hoa Ngọt Ngào Dệt Kim Velcro Headband Magic Paste Hà",
    "description": "Cửa hàng: jewelrydream2021.vn · Mã SP: 52160607095",
    "shopeeUrl": "https://shopee.vn/product/324840844/52160607095",
    "imageUrl": "https://down-vn.img.susercontent.com/file/sg-11134201-822xk-moav7umjoe0xc9",
    "price": 20000,
    "currency": "VND",
    "category": "Thời Trang & Phụ Kiện",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_52160607095",
        "productId": "prod_csv_52160607095",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/324840844/52160607095",
        "affiliateUrl": "https://s.shopee.vn/BTksI6oKu",
        "shortCode": "shopee-52160607095",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_17532975547",
    "name": "Thùng 30 gói giấy ăn rút Topgia 3 màu cao cấp 4 lớp dày dặn, mềm mịn, thùng 16/36/40/46/10 gói",
    "description": "Cửa hàng: TopGia HCM · Mã SP: 17532975547",
    "shopeeUrl": "https://shopee.vn/product/729014007/17532975547",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mfevehfzp2iz43",
    "price": 74000,
    "currency": "VND",
    "category": "Học Tập & Sách Vở",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_17532975547",
        "productId": "prod_csv_17532975547",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/729014007/17532975547",
        "affiliateUrl": "https://s.shopee.vn/1AKfz7Rft",
        "shortCode": "shopee-17532975547",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_29416666887",
    "name": "【Bảo hành tại địa phương】 GOOJODOQ Quạt gấp 3 trong 1 180° im lặng 100 cấp độ có thể điều chỉnh siêu năng lượng gió Quạt di động Màn hình LED",
    "description": "Cửa hàng: Goojodoq Offical Shop.VN · Mã SP: 29416666887",
    "shopeeUrl": "https://shopee.vn/product/1053077389/29416666887",
    "imageUrl": "https://down-vn.img.susercontent.com/file/cn-11134207-7ras8-m8e7salrxoyacd",
    "price": 269000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_29416666887",
        "productId": "prod_csv_29416666887",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1053077389/29416666887",
        "affiliateUrl": "https://s.shopee.vn/W6bGu5Xf0",
        "shortCode": "shopee-29416666887",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_47214168667",
    "name": "TAYO Giá Đỡ Điện Thoại Xe Đạp Xe Máy Chân Kim Loại Chống Rung Có Mũ Chụp Kẹp Gắn 360 Độ",
    "description": "Cửa hàng: Kìm chất lượng cao · Mã SP: 47214168667",
    "shopeeUrl": "https://shopee.vn/product/1527919876/47214168667",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mqr9fvtftyq6fa",
    "price": 102000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_47214168667",
        "productId": "prod_csv_47214168667",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1527919876/47214168667",
        "affiliateUrl": "https://s.shopee.vn/LnB4b6Azz",
        "shortCode": "shopee-47214168667",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_40469885344",
    "name": "Sữa tắm Lifebuoy Thiên nhiên Detox Và Chăm Sóc Chuyên Sâu 800g",
    "description": "Cửa hàng: Unilever - Chăm Sóc Cá Nhân · Mã SP: 40469885344",
    "shopeeUrl": "https://shopee.vn/product/111138057/40469885344",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-msxrt4s1l0qs45",
    "price": 234000,
    "currency": "VND",
    "category": "Sức Khỏe & Sắc Đẹp",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_40469885344",
        "productId": "prod_csv_40469885344",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/111138057/40469885344",
        "affiliateUrl": "https://s.shopee.vn/qjRfW4Gz6",
        "shortCode": "shopee-40469885344",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_19192149998",
    "name": "[LOẠI TO ĐẶC BIỆT] Thùng 10 bịch khăn giấy rút Top Gia treo tường đa sắc 1280 tờ, siêu dai và mềm mịn",
    "description": "Cửa hàng: TopGia HCM Store · Mã SP: 19192149998",
    "shopeeUrl": "https://shopee.vn/product/1016604648/19192149998",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mswt8xbqhnnp65",
    "price": 139000,
    "currency": "VND",
    "category": "Học Tập & Sách Vở",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_19192149998",
        "productId": "prod_csv_19192149998",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1016604648/19192149998",
        "affiliateUrl": "https://s.shopee.vn/gQ1TD4uK5",
        "shortCode": "shopee-19192149998",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_25176208160",
    "name": "【Tặng quà/Bảo hành nửa năm】GOOJODOQ Quạt Turbo Jet 3600 mAh có thể sạc lại, cầm tay, di động, gió mạnh, tốc độ cao 100 vòng/phút",
    "description": "Cửa hàng: Goojodoq Offical Shop.VN · Mã SP: 25176208160",
    "shopeeUrl": "https://shopee.vn/product/1053077389/25176208160",
    "imageUrl": "https://down-vn.img.susercontent.com/file/cn-11134207-820l4-mkf025vn6vif61",
    "price": 300000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_25176208160",
        "productId": "prod_csv_25176208160",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1053077389/25176208160",
        "affiliateUrl": "https://s.shopee.vn/1BMI4830JC",
        "shortCode": "shopee-25176208160",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_50809290331",
    "name": "Giá Đỡ Điện Thoại Motowolf MH2- Kẹp điện thoại Motowolf MH2",
    "description": "Cửa hàng: Motowolf_HaNoi · Mã SP: 50809290331",
    "shopeeUrl": "https://shopee.vn/product/1041127359/50809290331",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mmk6su3t8dms90",
    "price": 525000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_50809290331",
        "productId": "prod_csv_50809290331",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1041127359/50809290331",
        "affiliateUrl": "https://s.shopee.vn/112rrp3deB",
        "shortCode": "shopee-50809290331",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_20567055749",
    "name": "[CHÍNH HÃNG ĐỘC QUYỀN] Tẩy Tế Bào Chết Body Dove Chăm Da Sáng Mịn 280G",
    "description": "Cửa hàng: Unilever - Chăm Sóc Cá Nhân · Mã SP: 20567055749",
    "shopeeUrl": "https://shopee.vn/product/111138057/20567055749",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-msxrkh0kslja94",
    "price": 189000,
    "currency": "VND",
    "category": "Học Tập & Sách Vở",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_20567055749",
        "productId": "prod_csv_20567055749",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/111138057/20567055749",
        "affiliateUrl": "https://s.shopee.vn/4AztddraDo",
        "shortCode": "shopee-20567055749",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_28576052647",
    "name": "[SIÊU TO, CAO CẤP] Giấy vệ sinh treo tường TopGia thùng 10 12 8 6 bịch đa sắc, combo tiết kiệm 1280 tờ",
    "description": "Cửa hàng: TopGia HCM Store · Mã SP: 28576052647",
    "shopeeUrl": "https://shopee.vn/product/1016604648/28576052647",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mswt60r9kgzu77",
    "price": 139000,
    "currency": "VND",
    "category": "Học Tập & Sách Vở",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_28576052647",
        "productId": "prod_csv_28576052647",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1016604648/28576052647",
        "affiliateUrl": "https://s.shopee.vn/40gTRKsDYn",
        "shortCode": "shopee-28576052647",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.851Z",
        "updatedAt": "2026-09-12T16:42:48.851Z"
      }
    ]
  },
  {
    "id": "prod_csv_10402966829",
    "name": "[Torriden Chính hãng] Serum DIVE IN chứa Hyaluronic Acid, 50ml, 50ml+50ml, Serum",
    "description": "Cửa hàng: VN_Torriden Official Store · Mã SP: 10402966829",
    "shopeeUrl": "https://shopee.vn/product/436346871/10402966829",
    "imageUrl": "https://down-vn.img.susercontent.com/file/sg-11134207-8258e-mrs2cmge7v9g4f",
    "price": 334000,
    "currency": "VND",
    "category": "Sức Khỏe & Sắc Đẹp",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.851Z",
    "updatedAt": "2026-09-12T16:42:48.851Z",
    "affiliateLinks": [
      {
        "id": "aff_10402966829",
        "productId": "prod_csv_10402966829",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/436346871/10402966829",
        "affiliateUrl": "https://s.shopee.vn/4Vck2FqJXu",
        "shortCode": "shopee-10402966829",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.852Z",
        "updatedAt": "2026-09-12T16:42:48.852Z"
      }
    ]
  },
  {
    "id": "prod_csv_50959109305",
    "name": "Giá Đỡ Điện Thoại Xe Máy Motowolf MH2 – Kẹp Ghi Đông/Chân Kính Chống Rung, Khóa Nhanh Chống Trộm",
    "description": "Cửa hàng: Số Má Đường Đèo · Mã SP: 50959109305",
    "shopeeUrl": "https://shopee.vn/product/227351969/50959109305",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mn8nqa2on6dg46",
    "price": 550000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.852Z",
    "updatedAt": "2026-09-12T16:42:48.852Z",
    "affiliateLinks": [
      {
        "id": "aff_50959109305",
        "productId": "prod_csv_50959109305",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/227351969/50959109305",
        "affiliateUrl": "https://s.shopee.vn/4LJJpwqwst",
        "shortCode": "shopee-50959109305",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.852Z",
        "updatedAt": "2026-09-12T16:42:48.852Z"
      }
    ]
  },
  {
    "id": "prod_csv_46508948627",
    "name": "[MẪU MỚI 2026] Combo 2 Tẩy Da Chết Dưỡng Ẩm Toàn Thân Dove 280g",
    "description": "Cửa hàng: Unilever - Chăm Sóc Cá Nhân · Mã SP: 46508948627",
    "shopeeUrl": "https://shopee.vn/product/111138057/46508948627",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-msxryqbrf8jt15",
    "price": 377000,
    "currency": "VND",
    "category": "Học Tập & Sách Vở",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.852Z",
    "updatedAt": "2026-09-12T16:42:48.852Z",
    "affiliateLinks": [
      {
        "id": "aff_46508948627",
        "productId": "prod_csv_46508948627",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/111138057/46508948627",
        "affiliateUrl": "https://s.shopee.vn/4qFaQrp2s0",
        "shortCode": "shopee-46508948627",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.852Z",
        "updatedAt": "2026-09-12T16:42:48.852Z"
      }
    ]
  },
  {
    "id": "prod_csv_46859620849",
    "name": "[SIÊU TIẾT KIỆM] Khăn Giấy Pio TopGia Đa Năng Cao Cấp Thùng 10 8 5 4 Siêu Dai Mềm Mịn 200 Lần Rút",
    "description": "Cửa hàng: TopGia HCM · Mã SP: 46859620849",
    "shopeeUrl": "https://shopee.vn/product/729014007/46859620849",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mswy7prrivpd88",
    "price": 69000,
    "currency": "VND",
    "category": "Học Tập & Sách Vở",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.852Z",
    "updatedAt": "2026-09-12T16:42:48.852Z",
    "affiliateLinks": [
      {
        "id": "aff_46859620849",
        "productId": "prod_csv_46859620849",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/729014007/46859620849",
        "affiliateUrl": "https://s.shopee.vn/4fwAEYpgCz",
        "shortCode": "shopee-46859620849",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.852Z",
        "updatedAt": "2026-09-12T16:42:48.852Z"
      }
    ]
  },
  {
    "id": "prod_csv_28733253030",
    "name": "[ MÀU MỚI ] Áo Thun Nữ Thắt Eo Ôm Body BYJANE chất thun mịn co dãn 4 chiều Women BYJANE - 315",
    "description": "Cửa hàng: BYJANE.HN · Mã SP: 28733253030",
    "shopeeUrl": "https://shopee.vn/product/1514216378/28733253030",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mrd99lbo8w0661",
    "price": 54000,
    "currency": "VND",
    "category": "Thời Trang & Phụ Kiện",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.852Z",
    "updatedAt": "2026-09-12T16:42:48.852Z",
    "affiliateLinks": [
      {
        "id": "aff_28733253030",
        "productId": "prod_csv_28733253030",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1514216378/28733253030",
        "affiliateUrl": "https://s.shopee.vn/5AsQpTnmC6",
        "shortCode": "shopee-28733253030",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.852Z",
        "updatedAt": "2026-09-12T16:42:48.852Z"
      }
    ]
  },
  {
    "id": "prod_csv_44383157988",
    "name": "Giá Đỡ Điện Thoại Xe Máy MOTOWOLF MDL2827D Chính Hãng Xoay 360 Chống Rung - Gắn Ghi Đông, Chân Kính, Kẹp",
    "description": "Cửa hàng: Dou Travel · Mã SP: 44383157988",
    "shopeeUrl": "https://shopee.vn/product/983711328/44383157988",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mrb8klykd5aef9",
    "price": 459000,
    "currency": "VND",
    "category": "Điện Tử & Công Nghệ",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.852Z",
    "updatedAt": "2026-09-12T16:42:48.852Z",
    "affiliateLinks": [
      {
        "id": "aff_44383157988",
        "productId": "prod_csv_44383157988",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/983711328/44383157988",
        "affiliateUrl": "https://s.shopee.vn/50Z0dAoPX5",
        "shortCode": "shopee-44383157988",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.852Z",
        "updatedAt": "2026-09-12T16:42:48.852Z"
      }
    ]
  },
  {
    "id": "prod_csv_26904783421",
    "name": "Xốt Phô Mai Tanzy Foods 500g chấm gà rán đồ chiên , mì trộn , hải sản , đồ nướng , BBQ",
    "description": "Cửa hàng: Tanzy Foods Official Store · Mã SP: 26904783421",
    "shopeeUrl": "https://shopee.vn/product/1302299325/26904783421",
    "imageUrl": "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-ms55s9uuznk780",
    "price": 64000,
    "currency": "VND",
    "category": "Gia Dụng & Đời Sống",
    "userId": "vinh-admin-master-id",
    "createdAt": "2026-09-12T16:42:48.852Z",
    "updatedAt": "2026-09-12T16:42:48.852Z",
    "affiliateLinks": [
      {
        "id": "aff_26904783421",
        "productId": "prod_csv_26904783421",
        "network": "SHOPEE",
        "originalUrl": "https://shopee.vn/product/1302299325/26904783421",
        "affiliateUrl": "https://s.shopee.vn/2qUW3Bwevg",
        "shortCode": "shopee-26904783421",
        "clicks": 0,
        "conversions": 0,
        "clickCount": 0,
        "conversionCount": 0,
        "revenue": 0,
        "createdAt": "2026-09-12T16:42:48.852Z",
        "updatedAt": "2026-09-12T16:42:48.852Z"
      }
    ]
  }
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Tất cả danh mục" },
  { value: "Điện Tử & Công Nghệ", label: "💻 Điện Tử & Công Nghệ" },
  { value: "Học Tập & Sách Vở", label: "📚 Học Tập & Sách Vở" },
  { value: "Thời Trang & Phụ Kiện", label: "👕 Thời Trang & Phụ Kiện" },
  { value: "Mẹ & Bé", label: "🍼 Mẹ & Bé" },
  { value: "Gia Dụng & Đời Sống", label: "🏠 Gia Dụng & Đời Sống" },
  { value: "Sức Khỏe & Sắc Đẹp", label: "💄 Sức Khỏe & Sắc Đẹp" },
  { value: "Thể Thao & Dã Ngoại", label: "⚽ Thể Thao & Dã Ngoại" },
  { value: "Khác", label: "📦 Khác" },
];

const classifyCategoryByName = (name: string): string => {
  if (!name) return "Điện Tử & Công Nghệ";
  const lower = name.toLowerCase();

  if (
    /tai nghe|bluetooth|máy tính|laptop|điện thoại|iphone|samsung|xiaomi|sạc|cáp|loa|bàn phím|chuột|camera|thẻ nhớ|webcam|ipad|tablet|linh kiện|usb|smartwatch|đồng hồ thông minh|sạc dự phòng|ốp lưng|kính cường lực|sạc nhanh|tai nghe không dây|soundbar|mic|micro/i.test(
      lower
    )
  ) {
    return "Điện Tử & Công Nghệ";
  }

  if (
    /sách|vở|bút|thước|cặp|ba lô học sinh|giấy|sổ|tiểu thuyết|truyện|tập|dụng cụ học tập|flashcard|bảng vẽ|tô màu|bút chì|bút mực|bút nhớ|gọt bút|tẩy|tập tô|bút dạ|giấy in|tài liệu|ôn thi|từ điển/i.test(
      lower
    )
  ) {
    return "Học Tập & Sách Vở";
  }

  if (
    /áo|quần|váy|đầm|giày|dép|nón|mũ|túi xách|ví|thắt lưng|kính mát|trang sức|dây chuyền|nhẫn|vòng tay|bộ thun|lụa|hoodie|jacket|polo|sơ mi|chân váy|tất|vớ|khăn|áo khoác|quần jean|kính mắt|khuyên tai/i.test(
      lower
    )
  ) {
    return "Thời Trang & Phụ Kiện";
  }

  if (
    /tã|bỉm|sữa|trẻ em|cho bé|sơ sinh|xe đẩy|nôi|đồ chơi trẻ em|gấu bông|bình sữa|ăn dầm|núm ti|quần áo bé|yếm|hút sữa|xe tập đi|ghế ăn dầm|tã dán|tã quần/i.test(
      lower
    )
  ) {
    return "Mẹ & Bé";
  }

  if (
    /nồi|chảo|ly|cốc|bình giữ nhiệt|kệ|tủ|chăn|ga|gối|nệm|máy hút bụi|quạt|đèn|khăn tắm|thảm|bếp|máy xay|dung dịch rửa|nước giặt|tinh dầu|ghế|bàn|dao|thớt|vệ sinh|khăn lau|nồi chiên|máy ép/i.test(
      lower
    )
  ) {
    return "Gia Dụng & Đời Sống";
  }

  if (
    /son|kem|phấn|serum|sữa rửa mặt|dưỡng da|trang điểm|nước hoa|dầu gội|sữa tắm|khẩu trang|vitamin|thực phẩm chức năng|mặt nạ|tẩy trang|nước hoa hồng|kem chống nắng|dưỡng ẩm|toner|tẩy tế bào|tóc/i.test(
      lower
    )
  ) {
    return "Sức Khỏe & Sắc Đẹp";
  }

  if (
    /bóng đá|cầu lông|bóng rổ|tập gym|thảm tập|tạ|lều|túi ngủ|xe đạp|giày chạy bộ|đồ thể thao|vợt|dây kháng lực|dã ngoại|bóng chuyền|bơi|kính bơi|găng tay/i.test(
      lower
    )
  ) {
    return "Thể Thao & Dã Ngoại";
  }

  return "Khác";
};


function parseCSVLineText(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parsePriceFromText(priceStr: string): number {
  if (!priceStr) return 0;
  let str = priceStr.replace(/[^0-9,kK.]/g, '');
  if (str.toLowerCase().endsWith('k')) {
    let valStr = str.slice(0, -1).replace(',', '.');
    return Math.round(parseFloat(valStr) * 1000);
  }
  let clean = str.replace(/\./g, '').replace(',', '.');
  return Math.round(parseFloat(clean) || 0);
}

const ensureAbsoluteUrl = (url?: string) => {
  if (!url) return "#";
  let trimmed = url.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return "https://" + trimmed;
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedPromptProduct, setSelectedPromptProduct] = useState<Product | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState<Product | null>(null);
  const [affiliateNetwork, setAffiliateNetwork] = useState<AffiliateNetwork>("SHOPEE");
  const [affiliateOriginalUrl, setAffiliateOriginalUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [scraping, setScraping] = useState(false);

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, currency: "VND", shopeeUrl: "", affiliateUrl: "", category: "Điện Tử & Công Nghệ" },
  });

  // Image upload state for Modal
  const [modalImageMode, setModalImageMode] = useState<'upload' | 'url'>('upload');
  const [modalImageFileName, setModalImageFileName] = useState('');
  const [analyzingModalImage, setAnalyzingModalImage] = useState(false);

  const handleModalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    setModalImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      form.setValue('imageUrl', b64);
      toast.success("Đã tải ảnh lên từ máy: " + file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeModalImage = async () => {
    const currentImg = form.getValues('imageUrl');
    if (!currentImg || !currentImg.startsWith('data:image/')) {
      toast.error('Vui lòng tải ảnh từ máy tính trước khi bấm nhận diện');
      return;
    }
    setAnalyzingModalImage(true);
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentImg,
          productName: form.getValues('name') || '',
          price: form.getValues('price') || 0,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        if (d.productName) {
          form.setValue('name', d.productName);
          form.setValue('category', classifyCategoryByName(d.productName));
        }
        if (d.estimatedPrice) form.setValue('price', d.estimatedPrice);
        if (d.description) form.setValue('description', d.description);
        toast.success("AI Vision đã nhận diện & phân loại: " + d.productName);
      }
    } catch {
      toast.error('Không thể nhận diện hình ảnh');
    } finally {
      setAnalyzingModalImage(false);
    }
  };

  const extractUrl = (text: string) => {
    if (!text) return "";
    const match = text.match(new RegExp('(https?://[^\\s]+)', 'i'));
    if (match) {
      return match[1].replace(/[.,;)]+$/, "").trim();
    }
    let clean = text.trim();
    if (clean && !clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "https://" + clean;
    }
    return clean;
  };

  const handleQuickAdd = async () => {
    const raw = extractUrl(quickUrl);
    if (!raw) {
      toast.error("Vui lòng dán đường link sản phẩm Shopee");
      return;
    }

    setScraping(true);
    try {
      let title = "";
      let price = 139000;
      let category = "";
      let imageUrl = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80";
      let desc = "Sản phẩm tiếp thị liên kết Shopee Affiliate";
      let resolvedAffUrl = raw;

      // 1. Call Next.js /api/resolve-shopee
      try {
        const resolveRes = await fetch('/api/resolve-shopee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
        });
        if (resolveRes.ok) {
          const resData = await resolveRes.json();
          if (resData.success && resData.data) {
            const d = resData.data;
            if (d.name) title = d.name;
            if (d.price) price = d.price;
            if (d.imageUrl) imageUrl = d.imageUrl;
            if (d.category) category = d.category;
            if (d.description) desc = d.description;
            if (d.affiliateUrl) resolvedAffUrl = d.affiliateUrl;
          }
        }
      } catch (e) {
        console.warn('Next.js resolver error:', e);
      }

      // Fallback extract from URL slug
      if (!title) {
        try {
          const urlObj = new URL(ensureAbsoluteUrl(raw));
          const parts = urlObj.pathname.split("/").filter(Boolean);
          if (parts.length > 0 && parts[0].length > 4 && !parts[0].startsWith("gP")) {
            title = decodeURIComponent(parts[0].replace(/-/g, " "));
          }
        } catch {}
      }

      if (!title) {
        title = "Sản phẩm Shopee [Mã: " + (raw.split("/").pop()?.slice(0, 8) || "Aff") + "]";
      }

      // Smart auto-classification based on product name
      const autoCategory = classifyCategoryByName(title);

      const cleanTarget = ensureAbsoluteUrl(raw);
      const cleanAff = ensureAbsoluteUrl(resolvedAffUrl);

      const newProd: Product = {
        id: "prod_aff_" + Date.now(),
        name: title,
        description: desc,
        shopeeUrl: cleanTarget,
        imageUrl: imageUrl,
        price: price,
        currency: "VND",
        category: autoCategory,
        userId: "vinh-admin-master-id",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        affiliateLinks: [
          {
            id: "aff_" + Date.now(),
            productId: "prod_aff_" + Date.now(),
            network: "SHOPEE",
            originalUrl: cleanTarget,
            affiliateUrl: cleanAff,
            shortCode: "shopee-" + Date.now().toString().slice(-4),
            clicks: 0,
            conversions: 0,
            clickCount: 0,
            conversionCount: 0,
            revenue: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      try {
        await productsApi.create({
          name: newProd.name,
          shopeeUrl: newProd.shopeeUrl,
          price: newProd.price,
          currency: newProd.currency,
          category: newProd.category || undefined,
          imageUrl: newProd.imageUrl || undefined,
          description: newProd.description || undefined,
        });
      } catch (e) {
        console.warn("Backend offline or auth demo, cached locally:", e);
      }

      if (typeof window !== "undefined") {
        const stored = JSON.parse(localStorage.getItem("custom_affiliate_products") || "[]");
        const updated = [newProd, ...stored.filter((p: Product) => p.shopeeUrl !== cleanTarget)];
        localStorage.setItem("custom_affiliate_products", JSON.stringify(updated));
      }

      setProducts((prev) => [newProd, ...prev.filter((p) => p.shopeeUrl !== cleanTarget)]);
      setQuickUrl("");
      toast.success(`Đã thêm & phân loại [${autoCategory}]: "${title.slice(0, 25)}..."`);
    } catch (err: any) {
      toast.error("Lỗi khi thêm sản phẩm: " + (err?.message || "Không thể xử lý"));
    } finally {
      setScraping(false);
    }
  };

  const handleAutoScrape = async () => {
    const raw = extractUrl(quickUrl);
    if (!raw) {
      toast.error("Vui lòng nhập đường link sản phẩm Shopee");
      return;
    }
    setScraping(true);
    try {
      let data: any = null;
      try {
        const resolveRes = await fetch('/api/resolve-shopee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
        });
        if (resolveRes.ok) {
          const resData = await resolveRes.json();
          if (resData.success && resData.data) {
            data = resData.data;
          }
        }
      } catch (err) {
        console.warn('Resolve error in handleAutoScrape:', err);
      }

      if (!data) {
        const res = await productsApi.scrapeShopee(raw);
        data = res.data.data;
      }

      const cleanShopee = ensureAbsoluteUrl(data.shopeeUrl || raw);
      const cleanAff = ensureAbsoluteUrl(data.affiliateUrl || raw);
      const autoCat = classifyCategoryByName(data.name || "");

      form.setValue("name", data.name);
      form.setValue("shopeeUrl", cleanShopee);
      form.setValue("affiliateUrl", cleanAff);
      form.setValue("price", data.price || 139000);
      form.setValue("category", autoCat);
      if (data.imageUrl) form.setValue("imageUrl", data.imageUrl);
      if (data.description) form.setValue("description", data.description);

      setAffiliateUrl(cleanAff);
      setAffiliateOriginalUrl(cleanShopee);
      toast.success("Đã bóc tách & phân loại danh mục [" + autoCat + "]!");
    } catch {
      const cleanTarget = ensureAbsoluteUrl(raw);
      const autoCat = classifyCategoryByName("Sản phẩm Shopee");
      form.setValue("name", "Sản phẩm Shopee");
      form.setValue("shopeeUrl", cleanTarget);
      form.setValue("affiliateUrl", cleanTarget);
      form.setValue("price", 150000);
      form.setValue("imageUrl", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80");
      form.setValue("description", "Sản phẩm tiếp thị liên kết Shopee Affiliate");
      form.setValue("category", autoCat);
      setAffiliateUrl(cleanTarget);
      setAffiliateOriginalUrl(cleanTarget);
      toast.success("Đã tự động nhận diện & phân loại link Shopee!");
    } finally {
      setScraping(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let loaded: Product[] = [];
      try {
        const res = await productsApi.list();
        loaded = res.data?.data || [];
      } catch (err) {
        console.warn("Using local cache for products:", err);
      }

      const localSaved: Product[] = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("custom_affiliate_products") || "[]")
        : [];

      const combined = [...localSaved, ...loaded, ...INITIAL_SHOPEE_CSV_PRODUCTS];
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      setProducts(unique);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllProducts = () => {
    if (!confirm("Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu sản phẩm trong kho?")) return;
    setProducts([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("custom_affiliate_products");
    }
    toast.success("Đã xóa toàn bộ sản phẩm khỏi kho!");
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (data: ProductForm) => {
    try {
      const cleanShopee = ensureAbsoluteUrl(extractUrl(data.shopeeUrl));
      const cleanAff = data.affiliateUrl ? ensureAbsoluteUrl(extractUrl(data.affiliateUrl)) : cleanShopee;
      const finalCategory = data.category || classifyCategoryByName(data.name);

      if (editingProduct) {
        try {
          await productsApi.update(editingProduct.id, { ...data, shopeeUrl: cleanShopee, category: finalCategory });
        } catch {}
        
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...p,
                  ...data,
                  shopeeUrl: cleanShopee,
                  category: finalCategory,
                  affiliateLinks: [
                    {
                      ...(p.affiliateLinks?.[0] || {
                        id: "aff_" + Date.now(),
                        productId: p.id,
                        network: "SHOPEE",
                        shortCode: "shopee-" + Date.now().toString().slice(-4),
                        clicks: 0,
                        conversions: 0,
                        clickCount: 0,
                        conversionCount: 0,
                        revenue: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      }),
                      originalUrl: cleanShopee,
                      affiliateUrl: cleanAff,
                    },
                  ],
                }
              : p
          )
        );

        if (typeof window !== "undefined") {
          const stored = JSON.parse(localStorage.getItem("custom_affiliate_products") || "[]");
          const updated = stored.map((p: Product) =>
            p.id === editingProduct.id
              ? {
                  ...p,
                  ...data,
                  shopeeUrl: cleanShopee,
                  category: finalCategory,
                  affiliateLinks: [
                    {
                      ...(p.affiliateLinks?.[0] || {
                        id: "aff_" + Date.now(),
                        productId: p.id,
                        network: "SHOPEE",
                        shortCode: "shopee-" + Date.now().toString().slice(-4),
                        clicks: 0,
                        conversions: 0,
                        clickCount: 0,
                        conversionCount: 0,
                        revenue: 0,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      }),
                      originalUrl: cleanShopee,
                      affiliateUrl: cleanAff,
                    },
                  ],
                }
              : p
          );
          localStorage.setItem("custom_affiliate_products", JSON.stringify(updated));
        }
        toast.success("Đã cập nhật thông tin sản phẩm");
      } else {
        const newProd: Product = {
          id: "prod_aff_" + Date.now(),
          name: data.name || "Sản phẩm Shopee mới",
          description: data.description || "Sản phẩm tiếp thị liên kết Shopee",
          shopeeUrl: cleanShopee,
          imageUrl: data.imageUrl || getImageForProduct(data.name || ""),
          price: data.price || 99000,
          currency: data.currency || "VND",
          category: finalCategory,
          userId: "vinh-admin-master-id",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          affiliateLinks: [
            {
              id: "aff_" + Date.now(),
              productId: "prod_aff_" + Date.now(),
              network: "SHOPEE",
              originalUrl: cleanShopee,
              affiliateUrl: cleanAff,
              shortCode: "shopee-" + Date.now().toString().slice(-4),
              clicks: 0,
              conversions: 0,
              clickCount: 0,
              conversionCount: 0,
              revenue: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        };

        try {
          await productsApi.create({ ...data, shopeeUrl: cleanShopee, category: finalCategory });
        } catch (e) {
          console.warn("Backend offline or auth demo, cached locally:", e);
        }

        if (typeof window !== "undefined") {
          const stored = JSON.parse(localStorage.getItem("custom_affiliate_products") || "[]");
          localStorage.setItem("custom_affiliate_products", JSON.stringify([newProd, ...stored]));
        }

        setProducts((prev) => [newProd, ...prev]);
        toast.success("Đã thêm sản phẩm thành công vào Kho Affiliate!");
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setQuickUrl("");
      setAffiliateUrl("");
      form.reset({ currency: "VND", category: "Điện Tử & Công Nghệ" });
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("Không thể lưu sản phẩm. Vui lòng kiểm tra lại.");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const existingAff = product.affiliateLinks?.[0]?.affiliateUrl || product.shopeeUrl;
    form.reset({
      name: product.name,
      description: product.description || "",
      shopeeUrl: product.shopeeUrl,
      affiliateUrl: existingAff,
      imageUrl: product.imageUrl || "",
      price: product.price,
      currency: product.currency,
      category: product.category || classifyCategoryByName(product.name),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    try {
      await productsApi.delete(id);
    } catch {}
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (typeof window !== "undefined") {
      const stored = JSON.parse(localStorage.getItem("custom_affiliate_products") || "[]");
      const filtered = stored.filter((p: Product) => p.id !== id);
      localStorage.setItem("custom_affiliate_products", JSON.stringify(filtered));
    }
    toast.success("Đã xóa sản phẩm khỏi kho!");
  };

  const handleSaveAffiliate = async () => {
    if (!showAffiliateModal) return;
    try {
      await productsApi.addAffiliateLink(showAffiliateModal.id, {
        network: affiliateNetwork,
        originalUrl: ensureAbsoluteUrl(affiliateOriginalUrl),
        affiliateUrl: ensureAbsoluteUrl(affiliateUrl),
      });
      setShowAffiliateModal(null);
      setAffiliateOriginalUrl("");
      setAffiliateUrl("");
      fetchProducts();
    } catch (error) {
      console.error("Failed to add affiliate link:", error);
    }
  };

  const handleAffiliateNetworkChange = (value: string) => {
    switch (value) {
      case "SHOPEE":
      case "LAZADA":
      case "TIKTOK":
      case "TIKI":
      case "SENDO":
        setAffiliateNetwork(value);
    }
  };

  
    const handleCSVFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          toast.error("File CSV không chứa dữ liệu sản phẩm!");
          return;
        }

        const rawItems: { code: string; name: string; price: number; shop: string; productUrl: string; affiliateUrl: string; autoCat: string }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLineText(lines[i]);
          if (cols.length >= 8) {
            const code = cols[0] || ("code_" + Date.now() + "_" + i);
            const name = cols[1];
            if (!name) continue;

            const rawPrice = cols[2];
            const price = parsePriceFromText(rawPrice);
            const shop = cols[4] || "";
            const productUrl = ensureAbsoluteUrl(cols[7] || cols[8] || "");
            const affiliateUrl = ensureAbsoluteUrl(cols[8] || cols[7] || "");
            const autoCat = classifyCategoryByName(name);

            rawItems.push({ code, name, price, shop, productUrl, affiliateUrl, autoCat });
          }
        }

        if (rawItems.length === 0) {
          toast.error("Không tìm thấy sản phẩm hợp lệ trong file CSV!");
          return;
        }

        toast.loading("⏳ Đang tự động bóc tách & lấy ảnh gốc từ Shopee cho " + rawItems.length + " sản phẩm...", { id: "csv_import_progress" });

        // Crawl exact real Shopee CDN images asynchronously for each product URL
        const importedProducts: Product[] = await Promise.all(
          rawItems.map(async (item) => {
            let fetchedImage = "";
            try {
              const res = await fetch("/api/resolve-shopee", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: item.productUrl }),
              });
              if (res.ok) {
                const resData = await res.json();
                if (resData.success && resData.data?.imageUrl) {
                  fetchedImage = resData.data.imageUrl;
                }
              }
            } catch (err) {
              console.warn("Crawl image error for item:", item.name, err);
            }

            const finalImg = (fetchedImage && fetchedImage.includes("http")) ? fetchedImage : getImageForProduct(item.name, item.code);

            return {
              id: "prod_csv_" + item.code,
              name: item.name,
              description: "Cửa hàng: " + (item.shop || "Shopee") + " · Mã SP: " + item.code,
              shopeeUrl: item.productUrl,
              imageUrl: finalImg,
              price: item.price || 100000,
              currency: "VND",
              category: item.autoCat,
              userId: "vinh-admin-master-id",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              affiliateLinks: [
                {
                  id: "aff_" + item.code,
                  productId: "prod_csv_" + item.code,
                  network: "SHOPEE",
                  originalUrl: item.productUrl,
                  affiliateUrl: item.affiliateUrl,
                  shortCode: "shopee-" + item.code,
                  clicks: 0,
                  conversions: 0,
                  clickCount: 0,
                  conversionCount: 0,
                  revenue: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
            };
          })
        );

        if (typeof window !== "undefined") {
          const stored = JSON.parse(localStorage.getItem("custom_affiliate_products") || "[]");
          const existingIds = new Set(stored.map((p: Product) => p.id));
          const updated = [...importedProducts.filter((p) => !existingIds.has(p.id)), ...stored];
          localStorage.setItem("custom_affiliate_products", JSON.stringify(updated));
        }

        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          return [...importedProducts.filter((p) => !existingIds.has(p.id)), ...prev];
        });

        toast.success("🎉 Đã tự động bóc tách & tải thành công ảnh gốc Shopee cho " + importedProducts.length + " sản phẩm mới!", { id: "csv_import_progress" });
      } catch (err: any) {
        toast.error("Lỗi khi đọc file CSV: " + (err?.message || "Format không hợp lệ"), { id: "csv_import_progress" });
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const handleCopyAllAffiliateLinks = () => {
    if (products.length === 0) {
      toast.error("Kho chưa có sản phẩm nào!");
      return;
    }

    const lines = products.map((p, index) => {
      const aff = p.affiliateLinks?.[0]?.affiliateUrl || p.shopeeUrl;
      return (index + 1) + ". " + p.name + "\n   ➡️ Link Aff: " + ensureAbsoluteUrl(aff);
    });

    const fullText = "=== DANH SÁCH " + products.length + " LINK SHOPEE AFFILIATE ===\n\n" + lines.join("\n\n");
    navigator.clipboard.writeText(fullText);
    toast.success("Đã sao chép toàn bộ " + products.length + " Link Shopee Affiliate vào Clipboard!");
  };

  const openModal = () => {
    setEditingProduct(null);
    form.reset({ currency: "VND", category: "Điện Tử & Công Nghệ" });
    setIsModalOpen(true);
  };

  const handleCopyPrompt = (product: Product) => {
    const rawAff = product.affiliateLinks?.[0]?.affiliateUrl || product.shopeeUrl;
    const affLink = ensureAbsoluteUrl(rawAff);
    const fullText = USER_AI_PROMPT_TEMPLATE + "\n\n---\nPRODUCT DETAILS:\n- Product Name: " + product.name + "\n- Image Reference: " + (product.imageUrl || 'N/A') + "\n- Price: " + formatCurrency(product.price) + "\n- Category: " + (product.category || 'General') + "\n- Shopee Affiliate Link: " + affLink;

    navigator.clipboard.writeText(fullText);
    setCopiedId("prompt_" + product.id);
    toast.success("Đã copy Prompt Google Flow cho \"" + product.name.slice(0, 22) + "...\"!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAffLink = (url: string, id: string) => {
    const targetUrl = ensureAbsoluteUrl(url);
    navigator.clipboard.writeText(targetUrl);
    setCopiedId("aff_" + id);
    toast.success("Đã sao chép link Shopee Affiliate!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter products by selected category filter
  const filteredProducts = products.filter((p) => {
    if (selectedCategoryFilter === "ALL") return true;
    return (p.category || "").toLowerCase().includes(selectedCategoryFilter.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="bg-red-600 text-white font-mono text-[10px] tracking-wider uppercase">
              AFFILIATE VAULT & PRODUCT HUB
            </Badge>
            <span className="text-xs font-mono text-zinc-400">{filteredProducts.length} / {products.length} SẢN PHẨM SHOPEE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Kho Lưu Trữ Link Affiliate Shopee
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Lưu trữ hình ảnh, gắn link tiếp thị Shopee và quản lý sản phẩm theo danh mục
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={"p-1.5 rounded text-xs flex items-center gap-1 transition-colors " + (viewMode === "grid" ? "bg-red-600 text-white font-bold" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Lưới Thẻ
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={"p-1.5 rounded text-xs flex items-center gap-1 transition-colors " + (viewMode === "table" ? "bg-red-600 text-white font-bold" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")}
            >
              <List className="h-3.5 w-3.5" />
              Bảng
            </button>
          </div>

          {products.length > 0 && (
            <Button
              onClick={handleClearAllProducts}
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
              title="Xóa toàn bộ kho sản phẩm"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Xóa Kho Sản Phẩm
            </Button>
          )}

          
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold cursor-pointer shadow-sm transition-all">
            <Upload className="h-3.5 w-3.5" />
            <span>Nhập CSV Hàng Loạt</span>
            <input type="file" accept=".csv" onChange={handleCSVFileUpload} className="hidden" />
          </label>

          <Button
            onClick={handleCopyAllAffiliateLinks}
            variant="outline"
            size="sm"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
            title="Copy toàn bộ danh sách link Shopee Affiliate"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy Tất Cả Link Aff ({products.length})
          </Button>

          <Button onClick={openModal} size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold">
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm Link Aff Mới
          </Button>
        </div>
      </div>

      {/* Quick Shopee Scraper Bar */}
      <Card className="bg-gradient-to-r from-red-50/70 via-zinc-50 to-white dark:from-red-950/20 dark:via-zinc-900 dark:to-zinc-950 border-red-200/60 dark:border-red-900/40">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
              <Sparkles className="h-4 w-4" />
              <span>GÁN LINK SHOPEE NHANH:</span>
            </div>
            <Input
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
              placeholder="Dán link sản phẩm Shopee (ví dụ: https://s.shopee.vn/... hoặc https://shopee.vn/...) rồi ấn Enter"
              className="flex-1 bg-white dark:bg-zinc-900 text-xs h-9"
            />
            <Button
              onClick={handleQuickAdd}
              disabled={scraping}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 font-semibold flex-shrink-0"
            >
              {scraping ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  + Thêm Vào Kho Ngay
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono pr-2 border-r border-white/[0.1] flex-shrink-0">
          <Filter className="h-3.5 w-3.5 text-red-500" />
          <span>LỌC DANH MỤC:</span>
        </div>
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = selectedCategoryFilter === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategoryFilter(cat.value)}
              className={"px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 " + (isSelected ? "bg-red-600 text-white shadow-sm" : "bg-[#111117] text-zinc-400 border border-white/[0.06] hover:border-white/[0.15] hover:text-white")}
            >
              <Tag className="h-3 w-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <Card className="p-12 text-center border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 mb-4 border border-red-200 dark:border-red-900/50">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Không tìm thấy sản phẩm nào {selectedCategoryFilter !== "ALL" ? "trong danh mục \"" + selectedCategoryFilter + "\"" : ""}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
            Bắt đầu bằng cách dán link sản phẩm Shopee vào thanh quét tự động ở trên, hoặc bấm nút &quot;Thêm Link Aff Mới&quot;.
          </p>
          <Button onClick={openModal} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
            <Plus className="h-4 w-4 mr-1.5" /> Thêm Sản Phẩm Mới
          </Button>
        </Card>
      )}

      {/* Visual Cards View Mode */}
      {viewMode === "grid" && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const rawAff = product.affiliateLinks?.[0]?.affiliateUrl || product.shopeeUrl;
            const affLink = ensureAbsoluteUrl(rawAff);
            return (
              <Card
                key={product.id}
                className="overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-red-500/50 dark:hover:border-red-500/50 transition-all flex flex-col justify-between group bg-[#111117]"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
                    <img
                      src={product.imageUrl || getImageForProduct(product.name)}
                      alt={product.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getImageForProduct(product.name);
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <Badge variant="default" className="bg-black/70 backdrop-blur-md text-white font-mono text-[10px]">
                        {product.category || "Điện Tử & Công Nghệ"}
                      </Badge>
                      <Badge variant="default" className="bg-red-600 text-white font-mono text-[10px]">
                        SHOPEE
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-white font-bold font-mono text-xs">
                      {formatCurrency(product.price, product.currency)}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-2.5">
                    <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug tracking-tight">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Affiliate Link Snippet */}
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono flex items-center justify-between gap-2">
                      <a
                        href={affLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 dark:text-red-400 hover:underline truncate flex items-center gap-1.5"
                        title={affLink}
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{affLink}</span>
                      </a>
                      <button
                        onClick={() => handleCopyAffLink(affLink, product.id)}
                        className="p-1 rounded text-zinc-400 hover:text-red-600 flex-shrink-0"
                        title="Sao chép link affiliate"
                      >
                        {copiedId === "aff_" + product.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2 mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => router.push("/dashboard/videos/create?productId=" + product.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8"
                    >
                      <Film className="h-3.5 w-3.5 mr-1" />
                      Tạo Video AI
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyPrompt(product)}
                      className="w-full text-xs h-8 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {copiedId === "prompt_" + product.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          Đã Chép Prompt
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1 text-red-600" />
                          Copy Prompt Flow
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        setSelectedPromptProduct(product);
                        setShowPromptModal(true);
                      }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline font-mono"
                    >
                      Xem System Prompt chuẩn
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table View Mode */}
      {viewMode === "table" && filteredProducts.length > 0 && (
        <Card className="bg-[#111117]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hình ảnh</TableHead>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Link Affiliate Shopee</TableHead>
                    <TableHead className="text-right">Thao tác AI & Video</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const rawAff = product.affiliateLinks?.[0]?.affiliateUrl || product.shopeeUrl;
                    const affLink = ensureAbsoluteUrl(rawAff);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Thumbnail
                            src={product.imageUrl}
                            alt={product.name}
                            fallbackIcon={<Package className="h-6 w-6" />}
                            size="md"
                          />
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-white text-sm tracking-tight">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-xs text-zinc-500 line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-red-600 font-bold text-sm">
                          {formatCurrency(product.price, product.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="info" className="text-xs">
                            {product.category || "Điện Tử & Công Nghệ"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 max-w-xs font-mono text-xs">
                            <a
                              href={affLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 dark:text-red-400 hover:underline truncate flex items-center gap-1"
                              title={affLink}
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{affLink}</span>
                            </a>
                            <button
                              onClick={() => handleCopyAffLink(affLink, product.id)}
                              className="p-1 text-zinc-400 hover:text-red-600"
                              title="Sao chép link"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => router.push("/dashboard/videos/create?productId=" + product.id)}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-2.5"
                            >
                              <Film className="h-3 w-3 mr-1" />
                              Tạo Video AI
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyPrompt(product)}
                              className="text-xs h-7 px-2 border-zinc-300"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              className="h-7 w-7 p-0 text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Prompt Modal */}
      {showPromptModal && selectedPromptProduct && (
        <Modal
          isOpen={showPromptModal}
          onClose={() => setShowPromptModal(false)}
          title={"System Prompt Chuẩn Google Flow // " + selectedPromptProduct.name}
        >
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">
              Prompt này được cấu hình sẵn theo chuẩn kịch bản 15–20s dọc 9:16, voiceover 4 phân đoạn tiếng Việt tự nhiên:
            </p>
            <pre className="p-3 bg-zinc-950 text-zinc-200 text-xs font-mono rounded-lg overflow-x-auto max-h-72 whitespace-pre-wrap">
              {USER_AI_PROMPT_TEMPLATE}
              {"\n\n---\nPRODUCT:\n- Name: " + selectedPromptProduct.name + "\n- Price: " + formatCurrency(selectedPromptProduct.price) + "\n- Category: " + selectedPromptProduct.category + "\n- Link Affiliate Shopee: " + ensureAbsoluteUrl(selectedPromptProduct.affiliateLinks?.[0]?.affiliateUrl || selectedPromptProduct.shopeeUrl)}
            </pre>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <a
                href="https://labs.google/fx/tools/flow"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                Mở Google Flow (AI Pro)
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleCopyPrompt(selectedPromptProduct);
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Sao Chép Prompt
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowPromptModal(false);
                  router.push("/dashboard/videos/create?productId=" + selectedPromptProduct.id);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Film className="h-3.5 w-3.5 mr-1.5" />
                Vào Studio Tạo Video Ngay
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit / Create Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          form.reset({ currency: "VND", category: "Điện Tử & Công Nghệ" });
        }}
        title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới vào Kho"}
      >
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {!editingProduct && (
            <div className="p-3.5 bg-red-950/20 border border-red-800/40 rounded space-y-2">
              <label className="text-xs font-mono font-bold text-red-400 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                ⚡ Quét tự động từ link Shopee
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Dán link sản phẩm Shopee (https://shopee.vn/...)"
                  value={quickUrl}
                  onChange={(e) => setQuickUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={scraping}
                  onClick={handleAutoScrape}
                >
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Quét tự động"}
                </Button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Hệ thống sẽ tự động bóc tách Tên, Giá, Ảnh, Mô tả và phân loại danh mục tự động.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Tên sản phẩm"
              {...form.register("name", {
                onChange: (e) => {
                  const val = e.target.value;
                  if (val && val.length > 2) {
                    form.setValue("category", classifyCategoryByName(val));
                  }
                }
              })}
              placeholder="Tai nghe Bluetooth XYZ"
              error={form.formState.errors.name?.message}
            />
            
            <Select
              label="Danh mục sản phẩm (Tự động phân loại)"
              value={form.watch("category") || "Điện Tử & Công Nghệ"}
              onChange={(e) => form.setValue("category", e.target.value)}
              options={CATEGORY_OPTIONS.filter((c) => c.value !== "ALL")}
            />

            <Input
              label="URL Shopee Gốc"
              type="url"
              {...form.register("shopeeUrl")}
              placeholder="https://shopee.vn/product/123"
              error={form.formState.errors.shopeeUrl?.message}
            />

            <Input
              label="Link Affiliate Shopee (Rút gọn / Tracking)"
              type="url"
              {...form.register("affiliateUrl")}
              placeholder="https://s.shopee.vn/10mXyz..."
            />

            {/* Image Selection / Upload */}
            <div className="space-y-1.5 md:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-red-600" />
                  <span>Hình ảnh sản phẩm (Upload từ máy hoặc dán link)</span>
                </label>
                <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 p-0.5 rounded text-[11px]">
                  <button
                    type="button"
                    onClick={() => setModalImageMode('upload')}
                    className={"px-2 py-0.5 rounded transition-colors " + (modalImageMode === 'upload' ? 'bg-white dark:bg-zinc-900 font-bold text-red-600 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')}
                  >
                    📁 Tải từ máy tính
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalImageMode('url')}
                    className={"px-2 py-0.5 rounded transition-colors " + (modalImageMode === 'url' ? 'bg-white dark:bg-zinc-900 font-bold text-red-600 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')}
                  >
                    🔗 Dán link URL
                  </button>
                </div>
              </div>

              {modalImageMode === 'upload' ? (
                <div>
                  {form.watch("imageUrl") ? (
                    <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-2.5 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={form.watch("imageUrl")}
                          alt="Preview"
                          className="h-14 w-14 object-cover rounded-md border border-zinc-200 shadow-xs"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Đã chọn ảnh từ thiết bị
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                            {modalImageFileName || "Ảnh sản phẩm tải lên"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <label
                              htmlFor="modal-change-file"
                              className="text-[11px] text-blue-600 hover:underline cursor-pointer font-medium"
                            >
                              Đổi ảnh
                            </label>
                            <input
                              id="modal-change-file"
                              type="file"
                              accept="image/*"
                              onChange={handleModalImageUpload}
                              className="hidden"
                            />
                            <span className="text-zinc-300">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                form.setValue("imageUrl", "");
                                setModalImageFileName("");
                              }}
                              className="text-[11px] text-rose-600 hover:underline font-medium"
                            >
                              Xóa ảnh
                            </button>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAnalyzeModalImage}
                        disabled={analyzingModalImage}
                        className="text-xs h-8 border-red-300 text-red-700 hover:bg-red-50 shrink-0"
                      >
                        {analyzingModalImage ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Đang quét...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                            AI quét ảnh
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="modal-file-upload"
                        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-red-500 rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-900/60 hover:bg-red-50/20 transition-all duration-150 text-center"
                      >
                        <Upload className="h-5 w-5 text-red-600" />
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Bấm để tải ảnh từ máy tính lên
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          Hỗ trợ ảnh JPG, PNG, WEBP chụp từ điện thoại hoặc tải từ Shopee
                        </span>
                      </label>
                      <input
                        id="modal-file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleModalImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  label=""
                  type="url"
                  {...form.register("imageUrl")}
                  placeholder="https://example.com/image.jpg"
                />
              )}
            </div>

            <Input
              label="Giá sản phẩm"
              type="number"
              {...form.register("price", { valueAsNumber: true })}
              placeholder="299000"
              error={form.formState.errors.price?.message}
            />
            <Input
              label="Đơn vị tiền tệ"
              {...form.register("currency")}
              placeholder="VND"
            />
          </div>

          <Textarea
            label="Mô tả sản phẩm"
            {...form.register("description")}
            placeholder="Mô tả sản phẩm chi tiết..."
            rows={3}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              {editingProduct ? "Cập nhật" : "Tạo sản phẩm"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manual Affiliate Link Modal */}
      <Modal
        isOpen={!!showAffiliateModal}
        onClose={() => setShowAffiliateModal(null)}
        title={"Thêm link Affiliate: " + showAffiliateModal?.name}
      >
        <div className="space-y-4">
          <Select
            label="Mạng lưới"
            value={affiliateNetwork}
            onChange={(e) => handleAffiliateNetworkChange(e.target.value)}
            options={[
              { value: "SHOPEE", label: "Shopee" },
              { value: "LAZADA", label: "Lazada" },
              { value: "TIKTOK", label: "TikTok Shop" },
              { value: "TIKI", label: "Tiki" },
              { value: "SENDO", label: "Sendo" },
            ]}
            placeholder="Chọn mạng lưới"
          />
          <Input
            label="URL gốc"
            type="url"
            value={affiliateOriginalUrl}
            onChange={(e) => setAffiliateOriginalUrl(e.target.value)}
            placeholder="https://shopee.vn/product/123"
          />
          <Input
            label="Link Affiliate Shopee (Rút gọn)"
            type="url"
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
            placeholder="https://s.shopee.vn/10mXyz..."
          />
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAffiliateModal(null)}
            >
              Hủy
            </Button>
            <Button onClick={handleSaveAffiliate} className="bg-red-600 hover:bg-red-700 text-white">Lưu Link Aff</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
