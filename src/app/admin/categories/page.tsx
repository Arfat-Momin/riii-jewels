"use client";

import { useState, useEffect, useRef } from "react";
import { getCategories, addCategory, updateCategory, deleteCategory, uploadImage, Category } from "@/lib/firebase/services";
import { Plus, Edit2, Trash2, X, UploadCloud, Loader2, Layers } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // Bulk state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<Array<{
    name: string;
    imageUrl: string;
    description: string;
    isUploading: boolean;
  }>>([]);

  const addBulkRow = () => {
    setBulkItems(prev => [
      ...prev,
      { name: "", imageUrl: "", description: "", isUploading: false }
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
      { name: "", imageUrl: "", description: "", isUploading: false }
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
    }

    setLoading(true);
    try {
      const promises = bulkItems.map(item => {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const data = {
          name: item.name,
          slug,
          imageUrl: item.imageUrl || null,
          description: item.description || null
        };
        return addCategory(data);
      });
      await Promise.all(promises);
      await loadCategories();
      setIsBulkModalOpen(false);
      setBulkItems([]);
    } catch (error) {
      console.error("Bulk add categories failed", error);
      alert("Failed to add some categories.");
    } finally {
      setLoading(false);
    }
  };

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = async () => {
    setLoading(true);
    const data = await getCategories();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setName("");
    setSlug("");
    setImageUrl("");
    setDescription("");
    setEditingId(null);
    setIsModalOpen(false);
    setIsUploading(false);
  };

  const openEdit = (cat: Category) => {
    setName(cat.name);
    setSlug(cat.slug);
    setImageUrl(cat.imageUrl || "");
    setDescription(cat.description || "");
    setEditingId(cat.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, slug, imageUrl: imageUrl || null, description: description || null };

    if (editingId) {
      await updateCategory(editingId, data);
    } else {
      await addCategory(data);
    }
    await loadCategories();
    resetForm();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const url = await uploadImage(files[0]);
      setImageUrl(url);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDelete = async (id: string | number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await deleteCategory(id);
      await loadCategories();
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="p-8 bg-cream min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
          <p className="text-charcoal-light/75 font-medium text-sm">Loading categories list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-cream min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-serif text-3xl font-bold text-charcoal tracking-wide">Categories</h1>
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
            <Plus className="w-4 h-4 stroke-[3]" /> Add Category
          </button>
        </div>
      </div>

      <div className="bg-ivory border border-cream-dark rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cream-dark/30 border-b border-cream-dark text-xs text-charcoal-light uppercase tracking-wider font-semibold">
              <th className="p-4">Image</th>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark/40 text-sm">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-cream/40 transition-colors">
                <td className="p-4">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 object-cover rounded-md border border-cream-dark" />
                  ) : (
                    <div className="w-12 h-12 bg-cream-dark/50 rounded-md flex items-center justify-center text-[10px] text-charcoal-light/40 font-medium">No Image</div>
                  )}
                </td>
                <td className="p-4 font-medium text-charcoal">{cat.name}</td>
                <td className="p-4 text-charcoal-light/80">{cat.slug}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(cat)} className="text-gold-dark hover:text-charcoal transition-colors cursor-pointer" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 transition-colors cursor-pointer" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-ivory border border-cream-dark rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-cream-dark/50 pb-4">
              <h2 className="font-serif text-2xl font-bold text-charcoal">{editingId ? "Edit Category" : "Add New Category"}</h2>
              <button onClick={resetForm} className="text-charcoal-light/50 hover:text-charcoal transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingId) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Slug</label>
                <input
                  required
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50"
                />
              </div>

              {/* Dual Image Input Section */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Category Image</label>

                {/* Drag and Drop Zone */}
                <div
                  className="w-full border-2 border-dashed border-cream-dark hover:border-gold rounded-lg p-5 flex flex-col items-center justify-center text-charcoal-light/65 hover:bg-cream-dark/10 transition-colors cursor-pointer relative"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-gold mb-2" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-gold mb-2" />
                  )}
                  <p className="text-sm font-medium">{isUploading ? "Uploading to Imgbb..." : "Click or drag image here"}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-charcoal-light/40 uppercase tracking-widest font-semibold my-2">
                  <div className="h-px bg-cream-dark/70 flex-1"></div>
                  <span>OR</span>
                  <div className="h-px bg-cream-dark/70 flex-1"></div>
                </div>

                {/* Paste Field */}
                <div>
                  <label className="block text-[11px] font-semibold text-charcoal-light/60 uppercase tracking-wider mb-1">Image URL</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL here (e.g. https://...)"
                    className="w-full border border-cream-dark rounded-lg p-2 bg-white text-xs placeholder-charcoal-light/30 focus:border-gold/50"
                  />
                </div>

                {/* Preview */}
                {imageUrl && (
                  <div className="flex justify-center border-t border-cream-dark/30 pt-3 mt-3">
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-cream-dark group">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-1 right-1 bg-ivory rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-rose hover:bg-rose hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-light/75 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50 h-24"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-cream-dark/30">
                <button type="button" onClick={resetForm} className="px-4 py-2 border border-cream-dark rounded-lg text-charcoal-light/75 hover:bg-cream-dark/20 text-sm transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isUploading} className={`px-5 py-2 bg-gold hover:bg-gold-dark text-charcoal hover:text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-md shadow-gold/10 cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {editingId ? "Save Changes" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-ivory border border-cream-dark rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-cream-dark/50 pb-4 flex-shrink-0">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">Bulk Add Categories</h2>
                <p className="text-xs text-charcoal-light/60 mt-1">Add multiple categories at once. Slugs are automatically generated.</p>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-charcoal-light/50 hover:text-charcoal transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow mb-6 pr-2">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-cream-dark/30 border-b border-cream-dark text-xs text-charcoal-light uppercase tracking-wider font-semibold">
                    <th className="p-3 w-[30%]">Name *</th>
                    <th className="p-3 w-[35%]">Description</th>
                    <th className="p-3 w-[30%]">Image URL / Upload</th>
                    <th className="p-3 w-[5%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark/40 text-sm">
                  {bulkItems.map((item, index) => (
                    <tr key={index} className="hover:bg-cream/40 transition-colors">
                      <td className="p-3">
                        <input
                          required
                          type="text"
                          value={item.name}
                          onChange={(e) => updateBulkRow(index, "name", e.target.value)}
                          placeholder="Category Name"
                          className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateBulkRow(index, "description", e.target.value)}
                          placeholder="Optional description"
                          className="w-full border border-cream-dark rounded-lg p-2.5 bg-white text-sm focus:border-gold/50"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={item.imageUrl}
                            onChange={(e) => updateBulkRow(index, "imageUrl", e.target.value)}
                            placeholder="URL or Upload"
                            className="flex-1 border border-cream-dark rounded-lg p-2 bg-white text-xs focus:border-gold/50"
                          />
                          <label className="bg-cream border border-cream-dark hover:border-gold p-2 rounded-lg cursor-pointer transition-colors flex-shrink-0" title="Upload Image">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleBulkRowUpload(index, e.target.files)}
                            />
                            {item.isUploading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gold" />
                            ) : (
                              <UploadCloud className="w-4 h-4 text-gold" />
                            )}
                          </label>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeBulkRow(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          title="Remove Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={addBulkRow}
                className="mt-4 border border-dashed border-cream-dark hover:border-gold text-charcoal-light hover:text-gold-dark py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-medium w-full transition-colors text-sm bg-transparent"
              >
                <Plus className="w-4 h-4" /> Add Another Row
              </button>
            </div>

            <div className="flex justify-between items-center border-t border-cream-dark/50 pt-4 flex-shrink-0">
              <span className="text-xs text-charcoal-light/60">{bulkItems.length} category(ies) in list</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 border border-cream-dark rounded-lg text-charcoal-light/75 hover:bg-cream-dark/20 text-sm transition-colors cursor-pointer">Cancel</button>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  className="px-5 py-2 bg-gold hover:bg-gold-dark text-charcoal hover:text-white font-semibold rounded-lg text-sm transition-all duration-300 shadow-md shadow-gold/10 cursor-pointer"
                >
                  Save All Categories
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
