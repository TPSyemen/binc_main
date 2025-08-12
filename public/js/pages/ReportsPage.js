import { createElementFromHTML, showToast } from "../utils/helpers.js?v=2024"
import { reportsService } from "../services/api.js"
import store from "../state/store.js"

/**
 * Reports Page for Store Owners
 */
export default function ReportsPage() {
  const { user } = store.getState()
  if (!user || user.role !== 'store_owner') {
    return createElementFromHTML(`
      <div class="container mx-auto py-8 px-4">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-danger mb-4">Access Denied</h1>
          <p class="text-muted">You must be a store owner to access this page.</p>
        </div>
      </div>
    `)
  }

  const page = createElementFromHTML(`
    <div class="container mx-auto py-8 px-4">
      <div class="mb-8">
        <h1 class="text-4xl font-extrabold mb-2">Reports Center</h1>
        <p class="text-muted">Generate and download detailed reports for your store</p>
      </div>
      <div id="reports-content">
        <form id="report-form" class="card max-w-2xl mx-auto p-6 space-y-6">
          <h2 class="text-xl font-bold mb-4">Create New Report</h2>
          <div class="space-y-4">
            <div>
              <label for="report-type" class="block text-sm font-medium text-gray-700 mb-1">Report Type *</label>
              <select id="report-type" name="report_type" required class="input-field">
                <option value="">Select Report Type</option>
                <option value="store_performance">Store Performance Report</option>
                <option value="product_analysis">Product Analysis Report</option>
                <option value="customer_insights">Customer Insights Report</option>
                <option value="market_trends">Market Trends Report</option>
                <option value="competitive_analysis">Competitive Analysis Report</option>
                <option value="financial_summary">Financial Summary Report</option>
              </select>
            </div>
            <div>
              <label for="date-from" class="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
              <input type="date" id="date-from" name="date_from" required class="input-field">
            </div>
            <div>
              <label for="date-to" class="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
              <input type="date" id="date-to" name="date_to" required class="input-field">
            </div>
          </div>
          <div class="flex gap-4 mt-6">
            <button type="submit" class="btn btn-primary w-full">
              <i class="fa-solid fa-file-alt mr-2"></i>
              Generate Report
            </button>
          </div>
        </form>
        <div id="report-result" class="mt-8"></div>
      </div>
    </div>
  `)

  setupReportForm(page)
  return page
}

function setupReportForm(page) {
// دالة لتنسيق وعرض الجداول للـ visualizations
function renderVisualizations(visualizations) {
  let html = '<div class="mb-2"><b>Visualizations:</b></div>';
  // Daily Revenue Table
  // if (visualizations.revenue_chart && Array.isArray(visualizations.revenue_chart.data)) {
  //   html += `<div class="overflow-x-auto mb-4"><table class="min-w-max w-full table-auto border border-gray-200 rounded">
  //     <thead class="bg-gray-100">
  //       <tr>
  //         <th class="px-3 py-2 border">Date</th>
  //         <th class="px-3 py-2 border">Views</th>
  //         <th class="px-3 py-2 border">Revenue</th>
  //         <th class="px-3 py-2 border">Conversion Rate (%)</th>
  //       </tr>
  //     </thead>
  //     <tbody>
  //       ${visualizations.revenue_chart.data.map(row => `
  //         <tr>
  //           <td class="px-3 py-2 border">${row.date}</td>
  //           <td class="px-3 py-2 border">${row.views}</td>
  //           <td class="px-3 py-2 border">${row.revenue}</td>
  //           <td class="px-3 py-2 border">${row.conversion_rate.toFixed(2)}</td>
  //         </tr>
  //       `).join('')}
  //     </tbody>
  //   </table></div>`;
  // }
  // Product Performance Table
  if (visualizations.product_performance && Array.isArray(visualizations.product_performance.data)) {
    html += `<div class="overflow-x-auto mb-4"><table class="min-w-max w-full table-auto border border-gray-200 rounded">
      <thead class="bg-gray-100">
        <tr>
          <th class="px-3 py-2 border">Product Name</th>
          <th class="px-3 py-2 border">Views</th>
          <th class="px-3 py-2 border">Rating</th>
          <th class="px-3 py-2 border">Estimated Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${visualizations.product_performance.data.map(row => `
          <tr>
            <td class="px-3 py-2 border">${row.name}</td>
            <td class="px-3 py-2 border">${row.views}</td>
            <td class="px-3 py-2 border">${row.rating}</td>
            <td class="px-3 py-2 border">${row.revenue_estimate}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>`;
  }
  return html;
}
  const form = page.querySelector('#report-form')
  const resultContainer = page.querySelector('#report-result')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    resultContainer.innerHTML = ''
    const formData = new FormData(form)
    const reportType = formData.get('report_type')
    const dateFrom = formData.get('date_from')
    const dateTo = formData.get('date_to')

    if (!reportType || !dateFrom || !dateTo) {
      showToast('Please fill all required fields', 'error')
      return
    }

    form.querySelector('button[type="submit"]').disabled = true
    form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating...'

    try {
      // Call backend to generate report
      const report = await reportsService.generateReport({
        report_type: reportType,
        date_from: dateFrom,
        date_to: dateTo
      })
      if (report && report.id) {
        // رابط تحميل التقرير من الباك مباشرة
        const downloadUrl = `/api/reports/download/${report.id}/`;
        // عرض محتوى التقرير (raw_data و ai_summary_text)
        let reportContent = `<div class="card mt-6 p-4">
          <h4 class="font-bold mb-2">Report Details</h4>
          <div class="mb-2"><b>Type:</b> ${report.report_type_display || report.report_type}</div>
          <div class="mb-2"><b>Period:</b> ${report.date_from || '-'} إلى ${report.date_to || '-'}</div>
          <div class="mb-2"><b>Generated At:</b> ${report.generated_at ? new Date(report.generated_at).toLocaleString() : '-'}</div>
          <div class="mb-2"><b>Status:</b> ${report.status || '-'}</div>
          ${report.parameters ? `<div class="mb-2"><b>Parameters:</b> <pre class="text-xs bg-gray-50 rounded p-2 overflow-x-auto">${JSON.stringify(report.parameters, null, 2)}</pre></div>` : ''}
          ${report.ai_summary_text ? `<div class="mb-2"><b>AI Summary:</b> <div class="text-muted">${report.ai_summary_text}</div></div>` : ''}
          ${report.raw_data ? `<div class="mb-2"><b>Raw Data:</b> <pre class="text-xs bg-gray-50 rounded p-2 overflow-x-auto">${JSON.stringify(report.raw_data, null, 2)}</pre></div>` : ''}
          ${report.visualizations ? renderVisualizations(report.visualizations) : ''}
        </div>`;
        resultContainer.innerHTML = `
          <div class="card p-4 text-center">
            <h3 class="text-lg font-bold mb-2">Report Created Successfully</h3>
            <div class="mb-2 text-muted">Report ID: <b>${report.id}</b></div>
            <a href="${downloadUrl}" class="btn btn-success mt-3" download>
              <i class="fa-solid fa-download mr-2"></i>
              Download Report
            </a>
          </div>
          ${reportContent}
        `;
        showToast('Report created successfully!', 'success');
      } else {
        resultContainer.innerHTML = `<div class="text-danger">Failed to generate report. Please try again.</div>`;
      }
    } catch (error) {
      console.error('Error generating report:', error)
      resultContainer.innerHTML = `<div class="text-danger">Failed to generate report. Please try again.</div>`
      showToast('Failed to generate report', 'error')
    } finally {
      form.querySelector('button[type="submit"]').disabled = false
      form.querySelector('button[type="submit"]').innerHTML = '<i class="fa-solid fa-file-alt mr-2"></i>Generate Report'
    }
  })
}
