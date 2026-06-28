import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc, getDoc, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./config";

// Types
export interface Category {
  id: string | number;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
}

export interface Product {
  id: string | number;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;
  imageUrls: string[] | null;
  categoryId: string | number | null;
  sizes: string[] | null;
  description: string | null;
  featured: boolean | null;
  bestSeller: boolean | null;
  newArrival: boolean | null;
  onSale: boolean | null;
  outOfStock?: boolean | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  password?: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
}

// ========================
// Storage
// ========================
export async function uploadImage(file: File): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_IMGBB_API_KEY is not defined.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Imgbb upload failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.data.url;
}

// ========================
// Categories
// ========================

export async function getCategories(): Promise<Category[]> {
  try {
    const snapshot = await getDocs(collection(db, "categories"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function addCategory(category: Omit<Category, "id">): Promise<string | number> {
  const docRef = await addDoc(collection(db, "categories"), category);
  return docRef.id;
}

export async function updateCategory(id: string | number, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, "categories", String(id)), data);
}

export async function deleteCategory(id: string | number): Promise<void> {
  await deleteDoc(doc(db, "categories", String(id)));
}

// ========================
// Products
// ========================

export async function getProducts(): Promise<Product[]> {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function addProduct(product: Omit<Product, "id">): Promise<string | number> {
  const docRef = await addDoc(collection(db, "products"), product);
  return docRef.id;
}

export async function updateProduct(id: string | number, data: Partial<Product>): Promise<void> {
  await updateDoc(doc(db, "products", String(id)), data);
}

export async function deleteProduct(id: string | number): Promise<void> {
  await deleteDoc(doc(db, "products", String(id)));
}

// ========================
// Orders & Subscribers
// ========================

export interface Order {
  id?: string;
  userId?: string;
  customerName: string;
  phone: string;
  address: string;
  city?: string;
  pincode?: string;
  items: any[];
  totalAmount: number;
  status: string; // "Placed" | "Confirmed" | "Delivered"
  createdAt: string;
  paymentScreenshotUrl?: string;
  expectedDeliveryDate?: string; // ISO date string set by admin on confirmation
}

export async function addOrder(order: Omit<Order, "id" | "status" | "createdAt">): Promise<string> {
  const docRef = await addDoc(collection(db, "orders"), {
    ...order,
    status: "Placed",
    createdAt: new Date().toISOString()
  });
  return docRef.id;
}

export async function getOrdersByPhone(phone: string): Promise<Order[]> {
  try {
    const q = query(collection(db, "orders"), where("phone", "==", phone));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
  } catch (error) {
    console.error("Error fetching orders by phone:", error);
    return [];
  }
}

export async function addSubscriber(email: string): Promise<void> {
  await setDoc(doc(db, "subscribers", email), { email, subscribedAt: new Date().toISOString() });
}

// ========================
// Users & Auth
// ========================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function deleteUserByUid(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
  try {
    const q = query(collection(db, "orders"), where("userId", "==", uid));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
  } catch (e) {
    console.error("Could not delete user orders:", e);
  }
}

// Order management for Admin
export async function getAllOrders(): Promise<Order[]> {
  try {
    const snapshot = await getDocs(collection(db, "orders"));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return [];
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  extraData?: Partial<Pick<Order, "expectedDeliveryDate">>
): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), { status, ...(extraData || {}) });
}

export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
}

// ========================
// Feedbacks
// ========================

export interface Feedback {
  id?: string;
  orderId: string;
  customerName: string;
  rating: number; // 1-5
  text?: string;
  photoUrl?: string;
  createdAt: string;
  approved: boolean;
}

const LOCAL_FEEDBACKS_KEY = "rii_local_feedbacks";

function getLocalFeedbacks(): Feedback[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(LOCAL_FEEDBACKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error reading local feedbacks:", e);
    return [];
  }
}

function saveLocalFeedbacks(feedbacks: Feedback[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_FEEDBACKS_KEY, JSON.stringify(feedbacks));
  } catch (e) {
    console.error("Error saving local feedbacks:", e);
  }
}

export async function addFeedback(feedback: Omit<Feedback, "id" | "createdAt" | "approved">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "feedbacks"), {
      ...feedback,
      approved: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error: any) {
    console.warn("Firestore feedback submission failed, saving to localStorage:", error);
    if (error.code === "permission-denied" || String(error).includes("permissions")) {
      const local = getLocalFeedbacks();
      const newFeedback: Feedback = {
        id: "FB-local-" + Date.now(),
        ...feedback,
        approved: false,
        createdAt: new Date().toISOString(),
      };
      local.push(newFeedback);
      saveLocalFeedbacks(local);
      return newFeedback.id!;
    }
    throw error;
  }
}

export async function getAllFeedbacks(): Promise<Feedback[]> {
  try {
    const snapshot = await getDocs(collection(db, "feedbacks"));
    const fbList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Feedback));
    const local = getLocalFeedbacks();
    return [...fbList, ...local];
  } catch (error: any) {
    console.error("Error fetching feedbacks:", error);
    if (error.code === "permission-denied" || String(error).includes("permissions") || error.message?.includes("permissions")) {
      return getLocalFeedbacks();
    }
    return [];
  }
}

export async function approveFeedback(id: string): Promise<void> {
  if (id.startsWith("FB-local-")) {
    const local = getLocalFeedbacks();
    const updated = local.map(f => f.id === id ? { ...f, approved: true } : f);
    saveLocalFeedbacks(updated);
    return;
  }
  try {
    await updateDoc(doc(db, "feedbacks", id), { approved: true });
  } catch (error: any) {
    if (error.code === "permission-denied" || String(error).includes("permissions")) {
      const local = getLocalFeedbacks();
      const updated = local.map(f => f.id === id ? { ...f, approved: true } : f);
      saveLocalFeedbacks(updated);
      return;
    }
    throw error;
  }
}

export async function deleteFeedback(id: string): Promise<void> {
  if (id.startsWith("FB-local-")) {
    const local = getLocalFeedbacks();
    const updated = local.filter(f => f.id !== id);
    saveLocalFeedbacks(updated);
    return;
  }
  try {
    await deleteDoc(doc(db, "feedbacks", id));
  } catch (error: any) {
    if (error.code === "permission-denied" || String(error).includes("permissions")) {
      const local = getLocalFeedbacks();
      const updated = local.filter(f => f.id !== id);
      saveLocalFeedbacks(updated);
      return;
    }
    throw error;
  }
}

export async function getApprovedFeedbacks(): Promise<Feedback[]> {
  try {
    const q = query(collection(db, "feedbacks"), where("approved", "==", true));
    const snapshot = await getDocs(q);
    const fbList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Feedback));
    const localApproved = getLocalFeedbacks().filter(f => f.approved);
    return [...fbList, ...localApproved];
  } catch (error: any) {
    console.error("Error fetching approved feedbacks:", error);
    if (error.code === "permission-denied" || String(error).includes("permissions") || error.message?.includes("permissions")) {
      return getLocalFeedbacks().filter(f => f.approved);
    }
    return [];
  }
}

// ========================
// Store Settings (UPI QR, etc.)
// ========================

export interface StoreSettings {
  upiQrUrl?: string;       // Image URL of the UPI QR code
  upiId?: string;          // e.g. "7020059293@gpay"
  upiName?: string;        // e.g. "Areesha"
}

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "store"));
    if (docSnap.exists()) return docSnap.data() as StoreSettings;
    return {};
  } catch (error: any) {
    if (error?.code === "permission-denied" || String(error).includes("permissions")) {
      return {};
    }
    console.error("Error fetching store settings:", error);
    return {};
  }
}

export async function updateStoreSettings(data: Partial<StoreSettings>): Promise<void> {
  await setDoc(doc(db, "settings", "store"), data, { merge: true });
}

export async function getFeedbackByOrderId(orderId: string): Promise<Feedback | null> {
  try {
    const q = query(collection(db, "feedbacks"), where("orderId", "==", orderId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Feedback;
    }
    const local = getLocalFeedbacks();
    return local.find(f => f.orderId === orderId) || null;
  } catch (error: any) {
    console.error("Error fetching feedback by order:", error);
    if (error.code === "permission-denied" || String(error).includes("permissions") || error.message?.includes("permissions")) {
      const local = getLocalFeedbacks();
      return local.find(f => f.orderId === orderId) || null;
    }
    return null;
  }
}
