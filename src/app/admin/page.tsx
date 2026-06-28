"use client";

import { useEffect, useState } from "react";
import { getProducts, getCategories, getAllOrders, getAllUsers, Product, Category, Order, UserProfile } from "@/lib/firebase/services";
import { Package, Tags, ShoppingCart, Users } from "lucide-react";

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [p, c, o, u] = await Promise.all([getProducts(), getCategories(), getAllOrders(), getAllUsers()]);
      setProducts(p);
      setCategories(c);
      setOrders(o);
      setUsers(u);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-charcoal/50">Loading dashboard...</div>;
  }

  const pendingOrders = orders.filter(o => o.status === "Placed").length;

  const stats = [
    { label: "Total Products", value: products.length, icon: Package, color: "bg-gold/10 text-gold-dark border-gold/10" },
    { label: "Categories", value: categories.length, icon: Tags, color: "bg-sage/15 text-sage border-sage/15" },
    { label: "Total Orders", value: orders.length, icon: ShoppingCart, color: "bg-charcoal/8 text-charcoal border-charcoal/10", sub: pendingOrders > 0 ? `${pendingOrders} pending` : undefined },
    { label: "Registered Users", value: users.length, icon: Users, color: "bg-rose/10 text-rose border-rose/10" },
  ];

  return (
    <div className="p-8 bg-cream min-h-screen">
      <h1 className="font-serif text-3xl font-bold text-charcoal mb-8 tracking-wide">Dashboard Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-ivory p-6 rounded-xl border border-cream-dark shadow-sm flex items-center gap-5 transition-all duration-300 hover:shadow-md hover:border-gold/30">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-charcoal-light/60 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-serif font-bold text-charcoal mt-1">{stat.value}</p>
              {stat.sub && <p className="text-xs text-gold mt-0.5">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
