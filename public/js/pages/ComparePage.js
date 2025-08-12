// ComparePage.js
// Displays a comparison table for multiple products with the same name.

export default function ComparePage() {
    const container = document.createElement('div');
    container.className = 'compare-page container py-8 px-4';
    container.innerHTML = `
        <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">مقارنة المنتجات المتشابهة</h1>
        <div id="loading-spinner" class="text-center text-gray-500 mt-6">
            <svg class="animate-spin h-10 w-10 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-lg">جاري تحميل المنتجات للمقارنة...</p>
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
                <i class="fas fa-exclamation-circle ml-2"></i> يرجى اختيار منتج واحد على الأقل للمقارنة عبر صفحة المنتجات.
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
                        <i class="fas fa-times-circle ml-2"></i> ${productsList.error}
                    </p>`;
                aiDiv.innerHTML = '';
                return;
            }

            if (!Array.isArray(productsList) || productsList.length === 0) {
                resultTableDiv.innerHTML = `
                    <p class='text-orange-600 text-center bg-orange-100 p-4 rounded-lg border border-orange-200'>
                        <i class="fas fa-info-circle ml-2"></i> لم يتم العثور على منتجات متشابهة للمقارنة.
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
                                    <th class='py-3 px-4 text-center rounded-tl-lg'>الصورة</th>
                                    <th class='py-3 px-4 text-center'>الاسم</th>
                                    <th class='py-3 px-4 text-center'>المتجر</th>
                                    <th class='py-3 px-4 text-center'>السعر الأصلي</th>
                                    <th class='py-3 px-4 text-center'>السعر النهائي</th>
                                    <th class='py-3 px-4 text-center'>التقييم</th>
                                    <th class='py-3 px-4 text-center'>الكمية</th>
                                    <th class='py-3 px-4 text-center rounded-tr-lg'>الرابط</th>
                                </tr>
                                <tr class="bg-gray-100 text-gray-700 text-xs text-center font-semibold tracking-wide border-b border-gray-300">
                                    <th class='py-2 px-3'>صورة المنتج</th>
                                    <th class='py-2 px-3'>اسم المنتج</th>
                                    <th class='py-2 px-3'>اسم المتجر</th>
                                    <th class='py-2 px-3'>قبل الخصم</th>
                                    <th class='py-2 px-3'>بعد الخصم</th>
                                    <th class='py-2 px-3'>معدل التقييم</th>
                                    <th class='py-2 px-3'>الكمية المتاحة</th>
                                    <th class='py-2 px-3'>رابط خارجي</th>
                                </tr>
                            </thead>
                            <tbody class='text-gray-800 text-sm font-light divide-y divide-gray-200 bg-white'>`;

            productsList.forEach(p => {
                const imageUrl = (p.images && p.images[0]?.image) || (p.image_urls && p.image_urls[0]) || '/public/placeholder.jpg';
                const storeName = p.store?.name || 'متجر غير معروف';
                const productUrl = p.product_url || '#';

                tableHtml += `
                    <tr class='even:bg-gray-50 odd:bg-white hover:bg-blue-50 transition duration-200'>
                        <td class='py-3 px-4 text-center'>
                            <img src='${imageUrl}' alt='${p.name}' class='w-16 h-16 object-contain mx-auto rounded shadow-sm'>
                        </td>
                        <td class='py-3 px-4 text-center font-medium'>${p.name}</td>
                        <td class='py-3 px-4 text-center'>${storeName}</td>
                        <td class='py-3 px-4 text-center line-through text-gray-500'>${p.price ? parseFloat(p.price).toFixed(2) : '-'}</td>
                        <td class='py-3 px-4 text-center font-bold text-green-700 bg-green-50'>
                            ${p.final_price ? parseFloat(p.final_price).toFixed(2) : '-'} <span class="text-xs text-gray-500">ريال</span>
                        </td>
                        <td class='py-3 px-4 text-center'>
                            ${p.average_rating ? `${parseFloat(p.average_rating).toFixed(1)} <i class="fas fa-star text-yellow-400"></i>` : '-'}
                        </td>
                        <td class='py-3 px-4 text-center'>${p.stock_quantity ?? '-'}</td>
                        <td class='py-3 px-4 text-center'>
                            ${p.product_url ? `<a href="${productUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline transition duration-300">عرض المنتج <i class="fas fa-external-link-alt text-xs ml-1"></i></a>` : '-'}
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
                aiDiv.innerHTML = `<div class='text-center text-gray-500 mt-6'><i class="fas fa-robot animate-pulse text-xl"></i><p class="mt-2 text-lg">جاري توليد تحليل مقارنة بالذكاء الاصطناعي...</p></div>`;

                fetch('http://localhost:8000/api/comparisons/products/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        product_ids: productIdsForAI,
                        criteria: ["السعر", "المواصفات", "المتجر", "التقييمات"],
                        include_ai_recommendation: true
                    })
                })
                .then(aiRes => aiRes.ok ? aiRes.json() : aiRes.json().then(err => Promise.reject(err)))
                .then(aiComparisonResult => {
                    if (aiComparisonResult.error) {
                        aiDiv.innerHTML = `
                            <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200 mt-6'>
                                </p>`;
                    } else {
                        aiDiv.innerHTML = `
                            <div class="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6 max-w-3xl mx-auto shadow-md">
                              </div>`;
                    }
                })
                .catch(aiError => {
                    console.error("Error fetching AI comparison:", aiError);
                    aiDiv.innerHTML = `
                        <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200 mt-6'>
                         </p>`;
                });
            } else {
                aiDiv.innerHTML = `
                    <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6 max-w-3xl mx-auto text-center text-orange-800">
                     </div>`;
            }
        })
        .catch(error => {
            loadingSpinner.remove();
            console.error("Error fetching comparison data:", error);
            resultTableDiv.innerHTML = `
                <p class='text-red-600 text-center bg-red-100 p-4 rounded-lg border border-red-200'>
                 </p>`;
            aiDiv.innerHTML = '';
        });

    return container;
}
