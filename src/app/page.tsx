import StoreApp from "@/components/StoreApp";
import { getApprovedFeedbacks } from "@/lib/firebase/services";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Load approved feedbacks to show as testimonials on the main page
  const approvedFeedbacks = await getApprovedFeedbacks();

  const testimonials = approvedFeedbacks.map((fb, index) => ({
    id: index + 1,
    name: fb.customerName,
    text: fb.text || "Loved the product! Beautiful quality.",
    rating: fb.rating,
    imageUrl: fb.photoUrl || null,
  }));

  return (
    <>
      <StoreApp
        initialProducts={[]}
        initialCategories={[]}
        initialTestimonials={testimonials}
      />
    </>
  );
}
