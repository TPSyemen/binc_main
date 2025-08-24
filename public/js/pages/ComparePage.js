// ComparePage.js
// Displays a comparison table for multiple products with the same name.

import { showToast } from "../utils/helpers.js";

// Normalize relative media URLs to backend absolute URL
const normalizeImageUrl = (url) => {
    if (!url) return '/placeholder.jpg';
    if (typeof url !== 'string') return '/placeholder.jpg';
    // Keep absolute http(s) or data URLs as-is
    if (/^(?:https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
    // Ensure leading slash then prefix backend origin
    const path = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:8000${path}`;
};

export default function ComparePage() {
    const container = document.createElement('div');
    container.className = 'compare-page container py-8 px-4';
    container.innerHTML = ` 
        <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">Product Comparison</h1>
        <div id="loading-spinner" class="text-center text-gray-500 mt-6">
            <svg class="animate-spin h-10 w-10 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-lg">Loading products for comparison...</p>
        </div>
        <div id="compare-result-table" class="mt-6"></div>
        <div id="ai-analysis" class="mt-8"></div>
    `;

    const resultTableDiv = container.querySelector('#compare-result-table');
    const aiDiv = container.querySelector('#ai-analysis');
    const loadingSpinner = container.querySelector('#loading-spinner');

    let productIdentifier = null;

    if (typeof arguments[0] === 'object' && arguments[0] && arguments[0].query) {
        const queryParams = new URLSearchParams(arguments[0].query);
        productIdentifier = queryParams.get('product');
    } else {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        productIdentifier = hashParams.get('product');
    }

    if (!productIdentifier) {
        loadingSpinner.remove();
        resultTableDiv.innerHTML = `
            <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200'> 
                <i class="fas fa-exclamation-circle mr-2"></i> Please select at least one product for comparison from the product page.
            </p>`;
        return container;
    }

    fetch(`http://localhost:8000/api/comparisons/products/${productIdentifier}/`)
        .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)))
        .then(productsList => {
            loadingSpinner.remove();

            if (productsList.error) {
                resultTableDiv.innerHTML = `
                    <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200'>
                        <i class="fas fa-times-circle mr-2"></i> ${productsList.error}
                    </p>`;
                aiDiv.innerHTML = '';
                return;
            }

            if (!Array.isArray(productsList) || productsList.length === 0) {
                resultTableDiv.innerHTML = `
                    <p class='text-orange-600 text-center bg-orange-100 p-4 rounded-lg border border-orange-200'> 
                        <i class="fas fa-info-circle mr-2"></i> No similar products found for comparison.
                    </p>`;
                aiDiv.innerHTML = '';
                return;
            }

            let tableHtml = `
                <div class='flex justify-center'>
                    <div class='overflow-x-auto w-full max-w-6xl rounded-lg shadow-lg border border-gray-200'>
                        <table class='min-w-full bg-white'>
                            <thead> 
                                <tr class="bg-blue-600 text-white uppercase text-xs leading-normal">
                                    <th class='py-3 px-4 text-center rounded-tl-lg'>Image</th>
                                    <th class='py-3 px-4 text-center'>Name</th>
                                    <th class='py-3 px-4 text-center'>Store</th>
                                    <th class='py-3 px-4 text-center'>Original Price</th>
                                    <th class='py-3 px-4 text-center'>Final Price</th>
                                    <th class='py-3 px-4 text-center'>Rating</th>
                                    <th class='py-3 px-4 text-center'>Quantity</th>
                                    <th class='py-3 px-4 text-center rounded-tr-lg'>Link</th>
                                </tr>
                                <tr class="bg-gray-100 text-gray-700 text-xs text-center font-semibold tracking-wide border-b border-gray-300">
                                    <th class='py-2 px-3'>Product Image</th>
                                    <th class='py-2 px-3'>Product Name</th>
                                    <th class='py-2 px-3'>Store Name</th>
                                    <th class='py-2 px-3'>قبل الخصم</th>
                                    <th class='py-2 px-3'>بعد الخصم</th>
                                    <th class='py-2 px-3'>معدل التقييم</th>
                                    <th class='py-2 px-3'>الكمية المتاحة</th>
                                    <th class='py-2 px-3'>رابط خارجي</th>
                                </tr>
                            </thead>
                            <tbody class='text-gray-800 text-sm font-light divide-y divide-gray-200 bg-white'>`;

            // Group products by store to handle duplicates properly
            const storeGroups = {};
            productsList.forEach(p => {
                const storeId = p.store?.id || 'unknown';
                const storeName = p.store?.name || 'Unknown Store';
                
                if (!storeGroups[storeId]) {
                    storeGroups[storeId] = {
                        storeName: storeName,
                        products: [],
                        totalQuantity: 0
                    };
                }
                
                storeGroups[storeId].products.push(p);
                storeGroups[storeId].totalQuantity += (p.stock_quantity || 0);
            });

            // Display one row per store with aggregated information
            Object.values(storeGroups).forEach(group => {
                // Use the first product as representative (they should have same name)
                const representativeProduct = group.products[0];
                const rawImageUrl = representativeProduct.images?.[0]?.image ||
                                    representativeProduct.image_urls?.[0] ||
                                    '/placeholder.jpg';
                const imageUrl = normalizeImageUrl(rawImageUrl);
                const productUrl = representativeProduct.product_url || '#';
                
                // Calculate average price and rating for products in this store
                const avgPrice = group.products.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / group.products.length;
                const avgFinalPrice = group.products.reduce((sum, p) => sum + (parseFloat(p.final_price) || 0), 0) / group.products.length;
                const avgRating = group.products.reduce((sum, p) => sum + (parseFloat(p.average_rating) || 0), 0) / group.products.length;

                tableHtml += `
                    <tr class='even:bg-gray-50 odd:bg-white hover:bg-blue-50 transition duration-200'>
                        <td class='py-3 px-4 text-center'>
                            <img src='${imageUrl}' alt='${representativeProduct.name}' class='w-16 h-16 object-contain mx-auto rounded shadow-sm'>
                        </td> 
                        <td class='py-3 px-4 text-center font-medium'>
                            ${representativeProduct.name}
                            ${group.products.length > 1 ? `<br><small class="text-gray-500">(${group.products.length} variants)</small>` : ''} 
                        </td>
                        <td class='py-3 px-4 text-center'>${group.storeName}</td>
                        <td class='py-3 px-4 text-center line-through text-gray-500'>${avgPrice > 0 ? avgPrice.toFixed(2) : '-'}</td>
                        <td class='py-3 px-4 text-center font-bold text-green-700 bg-green-50'>
                            ${avgFinalPrice > 0 ? avgFinalPrice.toFixed(2) : '-'} <span class="text-xs text-gray-500">SAR</span>
                        </td>
                        <td class='py-3 px-4 text-center'>
                            ${avgRating > 0 ? `${avgRating.toFixed(1)} <i class="fas fa-star text-yellow-400"></i>` : '-'} 
                        </td>
                        <td class='py-3 px-4 text-center'>
                            <span class="px-2 py-1 rounded text-xs ${group.totalQuantity > 10 ? 'bg-success text-white' : group.totalQuantity > 0 ? 'bg-warning text-white' : 'bg-danger text-white'}">
                                ${group.totalQuantity} units
                            </span>
                        </td>
                        <td class='py-3 px-4 text-center'>
                            ${productUrl !== '#' ? `<a href="${productUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline transition duration-300">View Product <i class="fas fa-external-link-alt text-xs ml-1"></i></a>` : '-'}
                        </td>
                    </tr>`;
            });

            tableHtml += `
                            </tbody>
                        </table>
                    </div>
                </div>`;
            resultTableDiv.innerHTML = tableHtml;

            const productIdsForAI = productsList.map(p => p.id);
            if (productIdsForAI.length > 1) { 
                aiDiv.innerHTML = `<div class='text-center text-gray-500 mt-6'><i class="fas fa-robot animate-pulse text-xl"></i><p class="mt-2 text-lg">Generating AI comparison analysis...</p></div>`;

                fetch('http://localhost:8000/api/comparisons/products/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        product_ids: productIdsForAI,
                        criteria: ["price", "rating", "features", "value"],
                        include_ai_recommendation: true 
                    })
                })
                .then(aiRes => aiRes.ok ? aiRes.json() : aiRes.json().then(err => Promise.reject(err)))
                .then(aiComparisonResult => {
                    if (aiComparisonResult.error) {
 aiDiv.innerHTML = ` 
                            <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200 mt-6'>
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Failed to generate AI analysis: ${aiComparisonResult.error} 
                            </p>`;
                    } else {
                        showToast("comparison!", "success");
                        aiDiv.innerHTML = `
                            <div class="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6 max-w-3xl mx-auto shadow-md">
                                <h3 class="text-xl font-bold text-blue-800 mb-4 flex items-center">
                                     Analysis
                                </h3>
                                <div class="text-gray-700 leading-relaxed">
                                    ${(aiComparisonResult.ai_analysis && aiComparisonResult.ai_analysis.summary) || 'AI analysis completed successfully.'} 
                                </div>
                                ${aiComparisonResult.ai_analysis && aiComparisonResult.ai_analysis.recommendation ? `
                                    <div class=\"mt-4 p-4 bg-green-50 border border-green-200 rounded-lg\">
                                        <h4 class=\"font-semibold text-green-800 mb-2\">
                                            <i class=\"fas fa-thumbs-up mr-2\"></i>
                                            Recommendation
                                        </h4>
                                        <p class=\"text-green-700\">${aiComparisonResult.ai_analysis.recommendation.reason || ''}</p> 
                                    </div>
                                ` : ''}
                            </div>`;
                    }
                })
                .catch(aiError => {
                    console.error("Error fetching AI comparison:", aiError);
 showToast("Failed to generate AI analysis. Please try again later.", "error"); 
                    aiDiv.innerHTML = `
                        <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200 mt-6'>
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Failed to generate AI analysis. Please try again later. 
                        </p>`;
                });
            } else {
                aiDiv.innerHTML = `
                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6 max-w-3xl mx-auto text-center text-orange-800">
                        <i class="fas fa-info-circle mr-2"></i>
                        Need at least 2 products for AI comparison analysis.
                    </div>`; 
            }
        })
        .catch(error => {
            loadingSpinner.remove();
            console.error("Error fetching comparison data:", error);
            showToast("Error fetching comparison data. Please try again.", "error");
            resultTableDiv.innerHTML = `
                <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200'>
                    Error fetching comparison data. Please try again. </p>`;
            aiDiv.innerHTML = '';
        });

    return container;
}
