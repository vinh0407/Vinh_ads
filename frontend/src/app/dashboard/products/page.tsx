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

      const combined = [...localSaved, ...loaded];
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
          imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
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
                      src={product.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"}
                      alt={product.name}
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
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
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
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
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
