// import store from "../state/store.js"
// import { recommendationService } from "../services/api.js"
// import { ProductCard } from "../components/ProductCard.js"

// /**
//  * Renders a personalized recommendations section for authenticated users.
//  * Only visible if the user is logged in.
//  */
// export function PersonalizedRecommendationsSection() {
//   // Only show if user is authenticated
//   if (!store.state.isAuthenticated) return ""

//   // Create container
//   const section = document.createElement("section")
//   section.className = "my-10 bg-white rounded-xl shadow-lg border border-gray-100 p-6"
//   section.innerHTML = `
//     <h2 class="text-2xl font-bold text-primary mb-4 flex items-center">
//       <i class="fa-solid fa-star text-secondary mr-2"></i>
//       توصيات مخصصة لك
//     </h2>
//     <div id="personalized-recommendations-content">
//       <div class="loader w-8 h-8 border-4 border-gray-200 border-t-secondary rounded-full animate-spin mx-auto mb-4"></div>
//       <p class="text-gray-500 text-center">جاري تحميل التوصيات المخصصة...</p>
//     </div>
//   `

//   // Fetch personalized recommendations
//   recommendationService.getPersonalizedRecs()
//     .then(data => {
//       const content = section.querySelector("#personalized-recommendations-content")
//       if (data && data.recommendations && data.recommendations.length > 0) {
//         const grid = document.createElement('div');
//         grid.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6";
//         // Prepare products for legacy compatibility
//         const products = data.recommendations.map(product => {
//           if (!product.id && product.slug) product.id = product.slug;
//           if (!product.slug && product.id) product.slug = product.id;
//           if (!product.image_url && Array.isArray(product.image_urls) && product.image_urls.length > 0) product.image_url = product.image_urls[0];
//           if (!product.short_description && product.description) product.short_description = product.description;
//           return product;
//         });
//         grid.innerHTML = products.map(ProductCard).join("");
//         content.innerHTML = '';
//         content.appendChild(grid);
//       } else {
//         // عرض رسالة backend إذا توفرت
//         if (data && data.message) {
//           content.innerHTML = `<p class="text-gray-500 text-center">${data.message}</p>`;
//         } else {
//           content.innerHTML = `<p class="text-gray-500 text-center">لا توجد توصيات مخصصة حاليا.</p>`;
//         }
//       }
//     })
//     .catch((err) => {
//       const content = section.querySelector("#personalized-recommendations-content")
//       content.innerHTML = `<p class="text-danger text-center">تعذر تحميل التوصيات المخصصة.</p>`
//     })

//   return section
// }
