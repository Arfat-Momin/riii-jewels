"use client";

import { useState, useEffect, useRef } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, uploadImage, Product, Category } from "@/lib/firebase/services";
import { Plus, Edit2, Trash2, X, UploadCloud, Loader2, Layers, PackageX, PackageCheck } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // Bulk state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<Array<{
    name: string;
    price: string;
    categoryId: string;
    imageUrl: string;
    sizes: string;
    description: string;
    originalPrice: string;
    isUploading: boolean;
  }>>([]);

  const addBulkRow = () => {
    setBulkItems(prev => [
      ...prev,
      { name: "", price: "", categoryId: "", imageUrl: "", sizes: "", description: "", originalPrice: "", isUploading: false }
    ]);
  };

  const removeBulkRow = (index: number) => {
    setBulkItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateBulkRow = (index: number, field: string, value: any) => {
    setBulkItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleBulkRowUpload = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    updateBulkRow(index, "isUploading", true);
    try {
      const url = await uploadImage(files[0]);
      updateBulkRow(index, "imageUrl", url);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload image.");
    } finally {
      updateBulkRow(index, "isUploading", false);
    }
  };

  const openBulkAdd = () => {
    setBulkItems([
      { name: "", price: "", categoryId: "", imageUrl: "", sizes: "", description: "", originalPrice: "", isUploading: false }
    ]);
    setIsBulkModalOpen(true);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkItems.length === 0) {
      alert("Please add at least one row.");
      return;
    }
    for (let i = 0; i < bulkItems.length; i++) {
      if (!bulkItems[i].name.trim()) {
        alert(`Row ${i + 1} has no name.`);
        return;
      }
      if (!bulkItems[i].price.trim() || isNaN(Number(bulkItems[i].price))) {
        alert(`Row ${i + 1} has an invalid price.`);
        return;
      }
    }

    setLoading(true);
    try {
      const promises = bulkItems.map(item => {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const data: Omit<Product, "id"> = {
          name: item.name,
          slug,
          price: Number(item.price),
          originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
          imageUrl: item.imageUrl,
          imageUrls: [],
          categoryId: item.categoryId || null,
          sizes: item.sizes ? item.sizes.split(",").map(s => s.trim()).filter(Boolean) : null,
          description: item.description || null,
          featured: false,
          bestSeller: false,
          newArrival: false,
          onSale: false,
          outOfStock: false,
        };
        return addProduct(data);
      });
      await Promise.all(promises);
      await loadData();
      setIsBulkModalOpen(false);
      setBulkItems([]);
    } catch (error) {
      console.error("Bulk add failed", error);
      alert("Failed to add some products.");
    } finally {
      setLoading(false);
    }
  };

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [sizes, setSizes] = useState("");
  const [description, setDescription] = useState("");
  const [featured, setFeatured] = useState(false);
  const [bestSeller, setBestSeller] = useState(false);
  const [newArrival, setNewArrival] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([getProducts(), getCategories()]);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setName(""); setSlug(""); setPrice(""); setOriginalPrice("");
    setImageUrl(""); setImageUrls([]); setCategoryId(""); setSizes(""); setDescription("");
    setFeatured(false); setBestSeller(false); setNewArrival(false); setOnSale(false); setOutOfStock(false);
    setEditingId(null); setIsModalOpen(false); setIsUploading(false);
  };

  const openEdit = (p: Product) => {
    setName(p.name); setSlug(p.slug); setPrice(String(p.price));
    setOriginalPrice(p.originalPrice ? String(p.originalPrice) : "");
    setImageUrl(p.imageUrl); setImageUrls(p.imageUrls || []); setCategoryId(String(p.categoryId || ""));
    setSizes(p.sizes ? p.sizes.join(", ") : ""); setDescription(p.description || "");
    setFeatured(!!p.featured); setBestSeller(!!p.bestSeller); setNewArrival(!!p.newArrival);
    setOnSale(!!p.onSale); setOutOfStock(!!p.outOfStock);
    setEditingId(p.id); setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<Product, "id"> = {
      name, slug, price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      imageUrl, imageUrls,
      categoryId: categoryId || null,
      sizes: sizes ? sizes.split(",").map(s => s.trim()).filter(Boolean) : null,
      description: description || null,
      featured, bestSeller, newArrival, onSale, outOfStock,
    };

    if (editingId) {
      await updateProduct(editingId, data);
    } else {
      await addProduct(data);
    }
    await loadData();
    resetForm();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      if (!imageUrl && urls.length > 0) {
        setImageUrl(urls[0]);
        setImageUrls(prev => [...prev, ...urls.slice(1)]);
      } else {
        setImageUrls(prev => [...prev, ...urls]);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload images.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); };

  const removeImage = (urlToRemove: string) => {
    if (urlToRemove === imageUrl) {
      if (imageUrls.length > 0) { setImageUrl(imageUrls[0]); setImageUrls(imageUrls.slice(1)); }
      else { setImageUrl(""); }
    } else {
      setImageUrls(imageUrls.filter(u => u !== urlToRemove));
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProduct(id);
      await loadData();
    }
  };

  const toggleOutOfStock = async (p: Product) => {
    const newStatus = !p.outOfStock;
    if (confirm(`Mark "${p.name}" as ${newStatus ? "Out of Stock" : "In Stock"}?`)) {
      await updateProduct(p.id, { outOfStock: newStatus });
      await loadData();
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="p-8 bg-cream min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
          <p className="text-charcoal-light/75 font-medium text-sm">Loading products list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-cream min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl font-bold text-charcoal tracking-wide">Products Manager</h1>
        <div className="flex gap-3">
          <button
            onClick={openBulkAdd}
            className="border border-gold text-gold-dark hover:bg-gold hover:text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold shadow-sm transition-all duration-300 cursor-pointer text-sm bg-ivory"
          >
            <Layers className="w-4 h-4" /> Bulk Add
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gold hover:bg-gold-dark text-charcoal hover:text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold shadow-md shadow-gold/15 transition-all duration-300 cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-ivory border border-cream-dark rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-cream-dark/30 border-b border-cream-dark text-xs text-charcoal-light uppercase tracking-wider font-semibold">
              <th className="p-4">Image</th>
              <th className="p-4">Name</th>
              <th className="p-4">Price</th>
              <th className="p-4">Category</th>
              <th className="p-4">Badges</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark/40 text-sm">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-cream/40 transition-colors">
                <td className="p-4">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-md border border-cream-dark" />
                  ) : (
                    <div className="w-12 h-12 bg-cream-dark/50 rounded-md flex items-center justify-center text-[10px] text-charcoal-light/40 font-medium">No Image</div>
                  )}
                </td>
                <td className="p-4 font-medium text-charcoal">{p.name}</td>
                <td className="p-4 text-charcoal font-medium">
                  ₹{p.price.toLocaleString("en-IN")}
                  {p.originalPrice && (
                    <span className="text-charcoal-light/40 line-through text-xs ml-2 font-normal">₹{p.originalPrice.toLocaleString("en-IN")}</span>
                  )}
                </td>
                <td className="p-4 text-charcoal-light/80">{categories.find(c => c.id == p.categoryId)?.name || "-"}</td>
                <td className="p-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {p.featured && <span className="bg-gold/10 text-gold-dark border border-gold/20 text-[10px] px-2.5 py-0.5 rounded-full font-medium">Featured</span>}
                    {p.bestSeller && <span className="bg-sage/15 text-sage border border-sage/15 text-[10px] px-2.5 py-0.5 rounded-full font-medium">Best Seller</span>}
                    {p.newArrival && <span className="bg-rose/10 text-rose border border-rose/20 text-[10px] px-2.5 py-0.5 rounded-full font-medium">New</span>}
                    {p.onSale && <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] px-2.5 py-0.5 rounded-full font-medium">Sale</span>}
                  </div>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleOutOfStock(p)}
                    title={p.outOfStock ? "Mark as In Stock" : "Mark as Out of Stock"}
                    className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                      p.outOfStock
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    }`}
                  >
                    {p.outOfStock ? <PackageCheck className="w-3.5 h-3.5" /> : <PackageX className="w-3.5 h-3.5" />}
                    {p.outOfStock ? "In Stock" : "Out of Stock"}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(p)} className="text-gold-dark hover:text-charcoal transition-colors cursor-pointer" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 transition-colors cursor-pointer" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-ivory border border-cream-dark rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-cream-dark/50 pb-4">
              <h2 className="font-serif text-2xl font-bold text-charcoal">{editingId ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={resetForm} className="text-charcoal-light/50 hover:text-charcoal transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Name</label>
                <input
                  required type="text" value={name}
                  onChange={(e) => { setName(e.target.value); if (!editingId) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Slug</label>
                <input required type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Price (₹)</label>
                <input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Original Price (₹) – For Sale Items</label>
                <input type="number" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm placeholder-charcoal-light/30 focus:border-gold/50" placeholder="Optional" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Category</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50">
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Images */}
              <div className="md:col-span-2 space-y-3">
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Product Images</label>
                <div className="w-full border-2 border-dashed border-cream-dark hover:border-gold rounded-lg p-6 flex flex-col items-center justify-center text-charcoal-light/65 hover:bg-cream-dark/10 transition-colors cursor-pointer relative"
                  onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} />
                  {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-gold mb-2" /> : <UploadCloud className="w-8 h-8 text-gold mb-2" />}
                  <p className="text-sm font-medium">{isUploading ? "Uploading to Imgbb..." : "Click or drag images here to upload"}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-charcoal-light/40 uppercase tracking-widest font-semibold my-2">
                  <div className="h-px bg-cream-dark/70 flex-1" /><span>OR</span><div className="h-px bg-cream-dark/70 flex-1" />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-light/60 uppercase tracking-wider mb-1">Main Image URL</label>
                    <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Paste main image URL here (e.g. https://...)"
                      className="w-full border border-cream-dark rounded-lg p-2 bg-white text-xs placeholder-charcoal-light/30 focus:border-gold/50" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-light/60 uppercase tracking-wider mb-1">Additional Image URLs (comma-separated)</label>
                    <input type="text" value={imageUrls.join(", ")}
                      onChange={(e) => setImageUrls(e.target.value.split(",").map(url => url.trim()).filter(Boolean))}
                      placeholder="Paste other image URLs (e.g. https://url1.com, https://url2.com)"
                      className="w-full border border-cream-dark rounded-lg p-2 bg-white text-xs placeholder-charcoal-light/30 focus:border-gold/50" />
                  </div>
                </div>

                {(imageUrl || imageUrls.length > 0) && (
                  <div className="flex gap-3 mt-4 overflow-x-auto pb-2 border-t border-cream-dark/30 pt-4">
                    {imageUrl && (
                      <div className="relative w-20 h-20 flex-shrink-0 group rounded-lg overflow-hidden border border-cream-dark">
                        <img src={imageUrl} alt="Primary" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-charcoal/80 text-gold text-[9px] py-0.5 text-center font-serif tracking-widest uppercase">Main</span>
                        <button type="button" onClick={() => removeImage(imageUrl)} className="absolute top-1 right-1 bg-ivory rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-rose hover:bg-rose hover:text-white cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {imageUrls.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20 flex-shrink-0 group rounded-lg overflow-hidden border border-cream-dark">
                        <img src={url} alt={`Extra ${idx}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(url)} className="absolute top-1 right-1 bg-ivory rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-rose hover:bg-rose hover:text-white cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Sizes (comma separated)</label>
                <input type="text" value={sizes} onChange={(e) => setSizes(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50" placeholder="e.g. 6, 7, 8, S, M, L" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50 h-24" />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-5 py-2 border-t border-b border-cream-dark/30 my-2">
                {[
                  { label: "Featured", checked: featured, set: setFeatured },
                  { label: "Best Seller", checked: bestSeller, set: setBestSeller },
                  { label: "New Arrival", checked: newArrival, set: setNewArrival },
                  { label: "On Sale", checked: onSale, set: setOnSale },
                  { label: "Out of Stock", checked: outOfStock, set: setOutOfStock },
                ].map(({ label, checked, set }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="rounded border-cream-dark text-gold focus:ring-gold" />
                    <span className="text-sm font-medium text-charcoal-light/85 group-hover:text-charcoal">{label}</span>
                  </label>
                ))}
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={resetForm} className="px-4 py-2 border border-cream-dark rounded-lg text-charcoal-light/75 hover:bg-cream-dark/20 text-sm transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isUploading} className={`px-5 py-2 bg-gold hover:bg-gold-dark text-charcoal hover:text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-md shadow-gold/10 cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {editingId ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-ivory border border-cream-dark rounded-2xl shadow-2xl p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-cream-dark/50 pb-4 flex-shrink-0">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">Bulk Add Products</h2>
                <p className="text-xs text-charcoal-light/60 mt-1">Add multiple products at once. Slugs are automatically generated.</p>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-charcoal-light/50 hover:text-charcoal transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow mb-6 pr-2">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-cream-dark/30 border-b border-cream-dark text-xs text-charcoal-light uppercase tracking-wider font-semibold">
                    <th className="p-3 w-[20%]">Name *</th>
                    <th className="p-3 w-[10%]">Price (₹) *</th>
                    <th className="p-3 w-[10%]">Orig. Price</th>
                    <th className="p-3 w-[13%]">Category</th>
                    <th className="p-3 w-[13%]">Sizes</th>
                    <th className="p-3 w-[29%]">Image URL / Upload</th>
                    <th className="p-3 w-[5%] text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40 text-sm">
                  {bulkItems.map((item, index) => (
                    <tr key={index} className="hover:bg-cream/40 transition-colors">
                      <td className="p-3">
                        <input required type="text" value={item.name}
                          onChange={(e) => updateBulkRow(index, "name", e.target.value)}
                          placeholder="Product Name"
                          className="w-full border border-cream-dark rounded-lg p-2 bg-white text-sm focus:border-gold/50" />
                      </td>
                      <td className="p-3">
                        <input required type="number" min="0" value={item.price}
                          onChange={(e) => updateBulkRow(index, "price", e.target.value)}
                          placeholder="Price"
                          className="w-full border border-cream-dark rounded-lg p-2 bg-white text-sm focus:border-gold/50" />
                      </td>
                      <td className="p-3">
                        <input type="number" min="0" value={item.originalPrice}
                          onChange={(e) => updateBulkRow(index, "originalPrice", e.target.value)}
                          placeholder="Optional"
                          className="w-full border border-cream-dark rounded-lg p-2 bg-white text-sm focus:border-gold/50" />
                      </td>
                      <td className="p-3">
                        <select value={item.categoryId} onChange={(e) => updateBulkRow(index, "categoryId", e.target.value)}
                          className="w-full border border-cream-dark rounded-lg p-2 bg-white text-sm focus:border-gold/50">
                          <option value="">Category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <input type="text" value={item.sizes}
                          onChange={(e) => updateBulkRow(index, "sizes", e.target.value)}
                          placeholder="e.g. S, M, L"
                          className="w-full border border-cream-dark rounded-lg p-2 bg-white text-sm focus:border-gold/50" />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 items-center">
                          <input type="text" value={item.imageUrl}
                            onChange={(e) => updateBulkRow(index, "imageUrl", e.target.value)}
                            placeholder="URL or Upload →"
                            className="flex-1 border border-cream-dark rounded-lg p-2 bg-white text-xs focus:border-gold/50" />
                          <label className="bg-cream border border-cream-dark hover:border-gold p-2 rounded-lg cursor-pointer transition-colors flex-shrink-0" title="Upload Image">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBulkRowUpload(index, e.target.files)} />
                            {item.isUploading ? <Loader2 className="w-4 h-4 animate-spin text-gold" /> : <UploadCloud className="w-4 h-4 text-gold" />}
                          </label>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button type="button" onClick={() => removeBulkRow(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1" title="Remove Row">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addBulkRow}
                className="mt-4 border border-dashed border-cream-dark hover:border-gold text-charcoal-light hover:text-gold-dark py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-medium w-full transition-colors text-sm bg-transparent">
                <Plus className="w-4 h-4" /> Add Another Row
              </button>
            </div>

            <div className="flex justify-between items-center border-t border-cream-dark/50 pt-4 flex-shrink-0">
              <span className="text-xs text-charcoal-light/60">{bulkItems.length} product(s) in list</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 border border-cream-dark rounded-lg text-charcoal-light/75 hover:bg-cream-dark/20 text-sm transition-colors cursor-pointer">Cancel</button>
                <button type="button" onClick={handleBulkSubmit}
                  className="px-5 py-2 bg-gold hover:bg-gold-dark text-charcoal hover:text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-md shadow-gold/10 cursor-pointer">
                  Save All Products
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
