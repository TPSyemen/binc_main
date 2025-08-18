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
        <h1 class="text-4xl font-extrabold mb-2">📊 Reports Center</h1>
        <p class="text-muted">Generate comprehensive reports with detailed analysis and customer insights</p>
      </div>
      
      <!-- Navigation Tabs -->
      <div class="mb-8">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button class="tab-button active" data-tab="generate">
              <i class="fa-solid fa-plus mr-2"></i>Generate Report
            </button>
            <button class="tab-button" data-tab="history">
              <i class="fa-solid fa-history mr-2"></i>Report History
            </button>
            <button class="tab-button" data-tab="templates">
              <i class="fa-solid fa-file-template mr-2"></i>Report Templates
            </button>
          </nav>
        </div>
      </div>

      <!-- Generate Report Tab -->
      <div id="generate-tab" class="tab-content active">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Report Form -->
          <div class="card p-6">
            <h2 class="text-xl font-bold mb-4">📋 Create New Report</h2>
            <form id="report-form" class="space-y-4">
              <div>
                <label for="report-type" class="block text-sm font-medium text-gray-700 mb-1">Report Type *</label>
                <select id="report-type" name="report_type" required class="input-field">
                  <option value="">Select Report Type</option>
                  <option value="store_performance">📈 Store Performance Report</option>
                  <option value="product_analysis">📦 Product Analysis Report</option>
                  <option value="customer_insights">👥 Customer Insights Report</option>
                  <option value="market_trends">📊 Market Trends Report</option>
                  <option value="competitive_analysis">🎯 Competitive Analysis Report</option>
                  <option value="financial_summary">💰 Financial Summary Report</option>
                </select>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="date-from" class="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                  <input type="date" id="date-from" name="date_from" required class="input-field">
                </div>
                <div>
                  <label for="date-to" class="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                  <input type="date" id="date-to" name="date_to" required class="input-field">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Report Format</label>
                <div class="space-y-2">
                  <label class="flex items-center">
                    <input type="checkbox" name="include_detailed_text" checked class="mr-2">
                    <span class="text-sm">📄 Detailed Text Analysis</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" name="include_summary" checked class="mr-2">
                    <span class="text-sm">📋 Executive Summary</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" name="include_customer_table" checked class="mr-2">
                    <span class="text-sm">👥 Customer Viewing Table</span>
                  </label>
                  <label class="flex items-center">
                    <input type="checkbox" name="include_visualizations" checked class="mr-2">
                    <span class="text-sm">📊 Charts & Visualizations</span>
                  </label>
                </div>
              </div>

              <button type="submit" class="btn btn-primary w-full">
                <i class="fa-solid fa-magic mr-2"></i>
                Generate Advanced Report
              </button>
            </form>
          </div>

          <!-- Report Preview -->
          <div class="card p-6">
            <h3 class="text-lg font-bold mb-4">📋 Report Preview</h3>
            <div id="report-preview" class="text-muted text-center py-8">
              <i class="fa-solid fa-file-alt text-4xl mb-4 text-gray-300"></i>
              <p>Select report type and date range to see preview</p>
            </div>
          </div>
        </div>
        
        <div id="report-result" class="mt-8"></div>
      </div>

      <!-- Report History Tab -->
      <div id="history-tab" class="tab-content">
        <div class="card p-6">
          <h2 class="text-xl font-bold mb-4">📚 Report History</h2>
          <div id="reports-history">
            <div class="text-center py-8">
              <div class="loader"></div>
              <p class="text-muted mt-2">Loading report history...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Templates Tab -->
      <div id="templates-tab" class="tab-content">
        <div class="card p-6">
          <h2 class="text-xl font-bold mb-4">📄 Report Templates</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 class="font-bold mb-2">📈 Weekly Performance</h3>
              <p class="text-sm text-muted mb-4">Comprehensive weekly analysis with customer insights</p>
              <button class="btn btn-outline btn-sm w-full" onclick="useTemplate('weekly_performance')">
                Use Template
              </button>
            </div>
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 class="font-bold mb-2">📊 Monthly Summary</h3>
              <p class="text-sm text-muted mb-4">Monthly business summary with trends analysis</p>
              <button class="btn btn-outline btn-sm w-full" onclick="useTemplate('monthly_summary')">
                Use Template
              </button>
            </div>
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 class="font-bold mb-2">👥 Customer Analysis</h3>
              <p class="text-sm text-muted mb-4">Deep dive into customer behavior and preferences</p>
              <button class="btn btn-outline btn-sm w-full" onclick="useTemplate('customer_analysis')">
                Use Template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `)

  setupReportForm(page)
  setupTabs(page)
  loadReportHistory(page)
  return page
}

// دالة لإعداد التبويبات
function setupTabs(page) {
  const tabButtons = page.querySelectorAll('.tab-button');
  const tabContents = page.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      button.classList.add('active');
      page.querySelector(`#${targetTab}-tab`).classList.add('active');
    });
  });
}

// دالة لتحميل تاريخ التقارير
async function loadReportHistory(page) {
  const historyContainer = page.querySelector('#reports-history');
  
  try {
    const reports = await reportsService.getReports();
    
    if (reports && reports.length > 0) {
      historyContainer.innerHTML = `
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${reports.map(report => `
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">Report #${report.id}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      ${report.report_type_display || report.report_type}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${report.date_from} - ${report.date_to}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                      report.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }">
                      ${report.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(report.generated_at).toLocaleDateString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewReport(${report.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                      <i class="fa-solid fa-eye"></i> View
                    </button>
                    ${report.status === 'COMPLETED' ? `
                      <button onclick="downloadReportPDF(${report.id})" class="text-green-600 hover:text-green-900">
                        <i class="fa-solid fa-download"></i> Download
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      historyContainer.innerHTML = `
        <div class="text-center py-8">
          <i class="fa-solid fa-file-alt text-4xl text-gray-300 mb-4"></i>
          <p class="text-muted">No reports generated yet</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading report history:', error);
    historyContainer.innerHTML = `
      <div class="text-center py-8">
        <p class="text-danger">Failed to load report history</p>
      </div>
    `;
  }
}

// دالة لعرض التقرير المفصل
function renderDetailedReport(report) {
  let html = `
    <div class="space-y-6">
      <!-- Report Header -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">📊 ${report.report_type_display || report.report_type}</h2>
            <p class="text-gray-600">Report Period: ${report.date_from} to ${report.date_to}</p>
            <p class="text-sm text-gray-500">Generated on ${new Date(report.generated_at).toLocaleString()}</p>
          </div>
          <div class="text-right">
            <span class="px-3 py-1 rounded-full text-sm font-medium ${
              report.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
              'bg-yellow-100 text-yellow-800'
            }">
              ${report.status}
            </span>
          </div>
        </div>
      </div>
  `;

  // Executive Summary
  if (report.ai_summary_text) {
    html += `
      <div class="card p-6">
        <h3 class="text-xl font-bold mb-4">📋 Executive Summary</h3>
        <div class="prose max-w-none">
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            ${report.ai_summary_text.replace(/\n/g, '<br>')}
          </div>
        </div>
      </div>
    `;
  }

  // Detailed Text Analysis
  if (report.detailed_analysis) {
    html += `
      <div class="card p-6">
        <h3 class="text-xl font-bold mb-4">📄 Detailed Analysis</h3>
        <div class="prose max-w-none">
          ${report.detailed_analysis.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  }

  // Customer Viewing Table
  if (report.customer_data && Array.isArray(report.customer_data)) {
    html += renderCustomerViewingTable(report.customer_data);
  }

  // Visualizations
  if (report.visualizations) {
    html += renderVisualizations(report.visualizations);
  }

  // Raw Data (collapsible)
  if (report.raw_data) {
    html += `
      <div class="card p-6">
        <details class="group">
          <summary class="cursor-pointer font-bold text-lg mb-4 group-open:mb-4">
            📊 Raw Data & Metrics
            <i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform float-right"></i>
          </summary>
          <div class="bg-gray-50 rounded p-4 overflow-x-auto">
            <pre class="text-sm">${JSON.stringify(report.raw_data, null, 2)}</pre>
          </div>
        </details>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// دالة لعرض جدول العملاء المشاهدين
function renderCustomerViewingTable(customerData) {
  if (!customerData || customerData.length === 0) {
    return `
      <div class="card p-6">
        <h3 class="text-xl font-bold mb-4">👥 Customer Viewing Analysis</h3>
        <div class="text-center py-8">
          <i class="fa-solid fa-users text-4xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">No customer data available for this period</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="card p-6">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">👥 Customer Viewing Analysis</h3>
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-500">Total Customers: <strong>${customerData.length}</strong></span>
          <button onclick="exportCustomerTable()" class="btn btn-sm btn-outline">
            <i class="fa-solid fa-download mr-1"></i> Export
          </button>
        </div>
      </div>
      
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 rounded-lg p-4">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 rounded-lg">
              <i class="fa-solid fa-users text-blue-600"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-blue-600">Total Customers</p>
              <p class="text-lg font-bold text-blue-900">${customerData.length}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-green-50 rounded-lg p-4">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 rounded-lg">
              <i class="fa-solid fa-check-circle text-green-600"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-green-600">Converted</p>
              <p class="text-lg font-bold text-green-900">${customerData.filter(c => c.converted).length}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-yellow-50 rounded-lg p-4">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 rounded-lg">
              <i class="fa-solid fa-eye text-yellow-600"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-yellow-600">Avg Views</p>
              <p class="text-lg font-bold text-yellow-900">${Math.round(customerData.reduce((sum, c) => sum + (c.total_views || 0), 0) / customerData.length)}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-purple-50 rounded-lg p-4">
          <div class="flex items-center">
            <div class="p-2 bg-purple-100 rounded-lg">
              <i class="fa-solid fa-clock text-purple-600"></i>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-purple-600">Conversion Rate</p>
              <p class="text-lg font-bold text-purple-900">${Math.round((customerData.filter(c => c.converted).length / customerData.length) * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Table -->
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div class="flex items-center space-x-1">
                    <span>Customer</span>
                    <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                  </div>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div class="flex items-center space-x-1">
                    <span>Products</span>
                    <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                  </div>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div class="flex items-center space-x-1">
                    <span>Views</span>
                    <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                  </div>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div class="flex items-center space-x-1">
                    <span>Avg. Time</span>
                    <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                  </div>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${customerData.map((customer, index) => `
                <tr class="hover:bg-gray-50 transition-colors duration-150">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full ${customer.converted ? 'bg-green-100' : 'bg-gray-100'} flex items-center justify-center">
                          <i class="fa-solid fa-user ${customer.converted ? 'text-green-600' : 'text-gray-600'}"></i>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          ${customer.customer_name || customer.session_id || `Customer #${index + 1}`}
                        </div>
                        <div class="text-sm text-gray-500">
                          ${customer.customer_email || 'Guest User'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="text-sm font-medium text-gray-900">${customer.products_viewed || 0}</div>
                      <div class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        ${customer.products_viewed > 5 ? 'High' : customer.products_viewed > 2 ? 'Medium' : 'Low'}
                      </div>
                    </div>
                    <div class="text-xs text-gray-500">Unique products</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="text-sm font-medium text-gray-900">${customer.total_views || 0}</div>
                      <div class="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${Math.min((customer.total_views || 0) / 20 * 100, 100)}%"></div>
                      </div>
                    </div>
                    <div class="text-xs text-gray-500">Page views</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${customer.avg_time || '0m'}</div>
                    <div class="text-xs text-gray-500">Per session</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.converted 
                        ? 'bg-green-100 text-green-800' 
                        : customer.total_views > 5 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                    }">
                      <span class="w-1.5 h-1.5 mr-1.5 rounded-full ${
                        customer.converted 
                          ? 'bg-green-400' 
                          : customer.total_views > 5 
                            ? 'bg-yellow-400' 
                            : 'bg-gray-400'
                      }"></span>
                      ${customer.converted ? 'Converted' : customer.total_views > 5 ? 'Engaged' : 'Browsing'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      ${customer.last_activity ? new Date(customer.last_activity).toLocaleDateString() : 'N/A'}
                    </div>
                    <div class="text-xs text-gray-500">
                      ${customer.last_activity ? new Date(customer.last_activity).toLocaleTimeString() : ''}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                      <button onclick="viewCustomerDetails('${customer.session_id || customer.customer_id}')" 
                              class="text-indigo-600 hover:text-indigo-900 transition-colors">
                        <i class="fa-solid fa-eye"></i>
                      </button>
                      <button onclick="contactCustomer('${customer.customer_email}')" 
                              class="text-green-600 hover:text-green-900 transition-colors ${!customer.customer_email ? 'opacity-50 cursor-not-allowed' : ''}"
                              ${!customer.customer_email ? 'disabled' : ''}>
                        <i class="fa-solid fa-envelope"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        ${customerData.length > 10 ? `
          <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div class="flex-1 flex justify-between sm:hidden">
              <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Showing <span class="font-medium">1</span> to <span class="font-medium">${Math.min(10, customerData.length)}</span> of <span class="font-medium">${customerData.length}</span> results
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">1</button>
                  <button class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// دالة لتنسيق وعرض الجداول للـ visualizations
function renderVisualizations(visualizations) {
  if (!visualizations) {
    return `
      <div class="card p-6">
        <h3 class="text-xl font-bold mb-4">📊 Charts & Visualizations</h3>
        <div class="text-center py-8">
          <i class="fa-solid fa-chart-bar text-4xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">No visualization data available</p>
        </div>
      </div>
    `;
  }

  let html = `
    <div class="card p-6">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">📊 Charts & Visualizations</h3>
        <div class="flex space-x-2">
          <button onclick="exportVisualizationData()" class="btn btn-sm btn-outline">
            <i class="fa-solid fa-download mr-1"></i> Export Data
          </button>
          <button onclick="toggleChartView()" class="btn btn-sm btn-secondary">
            <i class="fa-solid fa-chart-line mr-1"></i> Chart View
          </button>
        </div>
      </div>
  `;
  
  // Product Performance Table
  if (visualizations.product_performance && Array.isArray(visualizations.product_performance.data)) {
    const productData = visualizations.product_performance.data;
    const totalRevenue = productData.reduce((sum, item) => sum + (parseFloat(item.revenue_estimate) || 0), 0);
    const totalViews = productData.reduce((sum, item) => sum + (parseInt(item.views) || 0), 0);
    
    html += `
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-lg font-semibold">📦 Product Performance Analysis</h4>
          <div class="text-sm text-gray-500">
            ${productData.length} products • $${totalRevenue.toFixed(2)} total revenue
          </div>
        </div>
        
        <!-- Performance Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-eye text-blue-600 text-xl mr-3"></i>
              <div>
                <p class="text-sm text-blue-600 font-medium">Total Views</p>
                <p class="text-xl font-bold text-blue-900">${totalViews.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-dollar-sign text-green-600 text-xl mr-3"></i>
              <div>
                <p class="text-sm text-green-600 font-medium">Total Revenue</p>
                <p class="text-xl font-bold text-green-900">$${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div class="bg-yellow-50 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-star text-yellow-600 text-xl mr-3"></i>
              <div>
                <p class="text-sm text-yellow-600 font-medium">Avg Rating</p>
                <p class="text-xl font-bold text-yellow-900">${(productData.reduce((sum, item) => sum + (parseFloat(item.rating) || 0), 0) / productData.length).toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Product</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Views</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Rating</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Revenue</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${productData.map((row, index) => {
                  const revenue = parseFloat(row.revenue_estimate) || 0;
                  const views = parseInt(row.views) || 0;
                  const rating = parseFloat(row.rating) || 0;
                  const performance = revenue > totalRevenue / productData.length ? 'high' : revenue > totalRevenue / (productData.length * 2) ? 'medium' : 'low';
                  
                  return `
                    <tr class="hover:bg-gray-50 transition-colors duration-150">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              ${(row.name || 'P').charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${row.name || 'Unknown Product'}</div>
                            <div class="text-sm text-gray-500">Rank #${index + 1}</div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="text-sm font-medium text-gray-900">${views.toLocaleString()}</div>
                          <div class="ml-2 w-20 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: ${Math.min((views / Math.max(...productData.map(p => parseInt(p.views) || 0))) * 100, 100)}%"></div>
                          </div>
                        </div>
                        <div class="text-xs text-gray-500">${((views / totalViews) * 100).toFixed(1)}% of total</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <span class="text-sm font-medium text-gray-900 mr-2">${rating.toFixed(1)}</span>
                          <div class="flex text-yellow-400">
                            ${Array.from({length: 5}, (_, i) => 
                              `<i class="fa-solid fa-star text-xs ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}"></i>`
                            ).join('')}
                          </div>
                        </div>
                        <div class="text-xs text-gray-500">${rating >= 4.5 ? 'Excellent' : rating >= 4 ? 'Good' : rating >= 3 ? 'Average' : 'Poor'}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">$${revenue.toFixed(2)}</div>
                        <div class="text-xs text-gray-500">${((revenue / totalRevenue) * 100).toFixed(1)}% of total</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          performance === 'high' ? 'bg-green-100 text-green-800' :
                          performance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }">
                          <span class="w-1.5 h-1.5 mr-1.5 rounded-full ${
                            performance === 'high' ? 'bg-green-400' :
                            performance === 'medium' ? 'bg-yellow-400' :
                            'bg-red-400'
                          }"></span>
                          ${performance === 'high' ? 'High' : performance === 'medium' ? 'Medium' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Revenue Chart Data
  if (visualizations.revenue_chart && Array.isArray(visualizations.revenue_chart.data)) {
    const revenueData = visualizations.revenue_chart.data;
    const totalRevenue = revenueData.reduce((sum, item) => sum + (parseFloat(item.revenue) || 0), 0);
    const totalViews = revenueData.reduce((sum, item) => sum + (parseInt(item.views) || 0), 0);
    const avgConversion = revenueData.reduce((sum, item) => sum + (parseFloat(item.conversion_rate) || 0), 0) / revenueData.length;
    
    html += `
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-lg font-semibold">💰 Revenue Trends Analysis</h4>
          <div class="text-sm text-gray-500">
            ${revenueData.length} data points • ${avgConversion.toFixed(2)}% avg conversion
          </div>
        </div>
        
        <!-- Revenue Summary -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div class="bg-green-50 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-dollar-sign text-green-600 text-xl mr-3"></i>
              <div>
                <p class="text-sm text-green-600 font-medium">Total Revenue</p>
                <p class="text-xl font-bold text-green-900">$${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-eye text-blue-600 text-xl mr-3"></i>
              <div>
                <p class="text-sm text-blue-600 font-medium">Total Views</p>
                <p class="text-xl font-bold text-blue-900">${totalViews.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div class="bg-purple-50 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-percentage text-purple-600 text-xl mr-3"></i>
              <div>
                <p class="text-sm text-purple-600 font-medium">Avg Conversion</p>
                <p class="text-xl font-bold text-purple-900">${avgConversion.toFixed(2)}%</p>
              </div>
            </div>
          </div>
          <div class="bg-orange-50 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-chart-line text-orange-600 text-xl mr-3"></i>
              <div>
                <p class="text-sm text-orange-600 font-medium">Daily Avg</p>
                <p class="text-xl font-bold text-orange-900">$${(totalRevenue / revenueData.length).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Date</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Views</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Revenue</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div class="flex items-center space-x-1">
                      <span>Conversion</span>
                      <i class="fa-solid fa-sort text-gray-400 cursor-pointer hover:text-gray-600"></i>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${revenueData.map((row, index) => {
                  const revenue = parseFloat(row.revenue) || 0;
                  const views = parseInt(row.views) || 0;
                  const conversion = parseFloat(row.conversion_rate) || 0;
                  const prevRevenue = index > 0 ? parseFloat(revenueData[index - 1].revenue) || 0 : revenue;
                  const trend = revenue > prevRevenue ? 'up' : revenue < prevRevenue ? 'down' : 'stable';
                  
                  return `
                    <tr class="hover:bg-gray-50 transition-colors duration-150">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${row.date}</div>
                        <div class="text-xs text-gray-500">${new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="text-sm font-medium text-gray-900">${views.toLocaleString()}</div>
                          <div class="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: ${Math.min((views / Math.max(...revenueData.map(r => parseInt(r.views) || 0))) * 100, 100)}%"></div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">$${revenue.toFixed(2)}</div>
                        <div class="text-xs text-gray-500">${((revenue / totalRevenue) * 100).toFixed(1)}% of total</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <span class="text-sm font-medium text-gray-900">${conversion.toFixed(2)}%</span>
                          <div class="ml-2 w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-purple-600 h-2 rounded-full" style="width: ${Math.min(conversion * 2, 100)}%"></div>
                          </div>
                        </div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trend === 'up' ? 'bg-green-100 text-green-800' :
                          trend === 'down' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }">
                          <i class="fa-solid ${
                            trend === 'up' ? 'fa-arrow-up' :
                            trend === 'down' ? 'fa-arrow-down' :
                            'fa-minus'
                          } mr-1"></i>
                          ${trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Stable'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

function setupReportForm(page) {
  const form = page.querySelector('#report-form')
  const resultContainer = page.querySelector('#report-result')
  const reportPreview = page.querySelector('#report-preview')

  // Update preview when report type changes
  const reportTypeSelect = form.querySelector('#report-type')
  reportTypeSelect.addEventListener('change', updateReportPreview)
  
  // Update preview when dates change
  const dateFromInput = form.querySelector('#date-from')
  const dateToInput = form.querySelector('#date-to')
  dateFromInput.addEventListener('change', updateReportPreview)
  dateToInput.addEventListener('change', updateReportPreview)

  function updateReportPreview() {
    const reportType = reportTypeSelect.value
    const dateFrom = dateFromInput.value
    const dateTo = dateToInput.value

    if (!reportType) {
      reportPreview.innerHTML = `
        <div class="text-center py-8">
          <i class="fa-solid fa-file-alt text-4xl mb-4 text-gray-300"></i>
          <p class="text-muted">Select report type to see preview</p>
        </div>
      `
      return
    }

    const reportDescriptions = {
      'store_performance': {
        icon: '📈',
        title: 'Store Performance Report',
        description: 'Complete overview of store performance including sales, customer behavior, and product analytics',
        includes: ['Executive Summary', 'Detailed Analysis', 'Customer Viewing Table', 'Performance Charts', 'Revenue Trends']
      },
      'product_analysis': {
        icon: '📦',
        title: 'Product Analysis Report',
        description: 'Detailed analysis of product views, ratings, and revenue performance',
        includes: ['Product Rankings', 'View Analytics', 'Rating Analysis', 'Revenue Attribution', 'Performance Trends']
      },
      'customer_insights': {
        icon: '👥',
        title: 'Customer Insights Report',
        description: 'Deep dive into customer interactions, viewing patterns, and conversion analysis',
        includes: ['Customer Journey Analysis', 'Viewing Patterns', 'Conversion Funnel', 'Customer Segmentation', 'Behavior Heatmaps']
      },
      'market_trends': {
        icon: '📊',
        title: 'Market Trends Report',
        description: 'Analysis of market trends and competitive positioning',
        includes: ['Market Analysis', 'Trend Identification', 'Competitive Insights', 'Opportunity Assessment', 'Market Share']
      },
      'competitive_analysis': {
        icon: '🎯',
        title: 'Competitive Analysis Report',
        description: 'Detailed competitive landscape analysis and positioning insights',
        includes: ['Competitor Analysis', 'Market Position', 'Pricing Comparison', 'Feature Analysis', 'Strategic Recommendations']
      },
      'financial_summary': {
        icon: '💰',
        title: 'Financial Summary Report',
        description: 'Comprehensive financial overview with revenue analysis and projections',
        includes: ['Revenue Summary', 'Financial Trends', 'Profit Analysis', 'Cost Breakdown', 'Growth Projections']
      }
    }

    const reportInfo = reportDescriptions[reportType]
    if (reportInfo) {
      reportPreview.innerHTML = `
        <div class="text-left">
          <div class="flex items-center mb-3">
            <span class="text-2xl mr-2">${reportInfo.icon}</span>
            <h4 class="font-bold text-lg">${reportInfo.title}</h4>
          </div>
          <p class="text-muted mb-4">${reportInfo.description}</p>
          ${dateFrom && dateTo ? `
            <div class="bg-blue-50 rounded p-3 mb-4">
              <p class="text-sm font-medium text-blue-800">Report Period</p>
              <p class="text-blue-600">${dateFrom} to ${dateTo}</p>
            </div>
          ` : ''}
          <div>
            <p class="font-medium mb-2">This report will include:</p>
            <ul class="text-sm space-y-1">
              ${reportInfo.includes.map(item => `
                <li class="flex items-center">
                  <i class="fa-solid fa-check text-green-500 mr-2"></i>
                  ${item}
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    resultContainer.innerHTML = ''
    
    const formData = new FormData(form)
    const reportType = formData.get('report_type')
    const dateFrom = formData.get('date_from')
    const dateTo = formData.get('date_to')
    
    // Get format options
    const includeDetailedText = formData.get('include_detailed_text') === 'on'
    const includeSummary = formData.get('include_summary') === 'on'
    const includeCustomerTable = formData.get('include_customer_table') === 'on'
    const includeVisualizations = formData.get('include_visualizations') === 'on'

    if (!reportType || !dateFrom || !dateTo) {
      showToast('Please fill all required fields', 'error')
      return
    }

    const submitButton = form.querySelector('button[type="submit"]')
    submitButton.disabled = true
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating Advanced Report...'

    try {
      // Prepare report data for backend
      const reportData = {
        report_type: reportType,
        date_from: dateFrom,
        date_to: dateTo
      }
      
      // Add format options as parameters if needed
      if (includeDetailedText || includeSummary || includeCustomerTable || includeVisualizations) {
        reportData.parameters = {
          include_detailed_text: includeDetailedText,
          include_summary: includeSummary,
          include_customer_table: includeCustomerTable,
          include_visualizations: includeVisualizations
        }
      }
      
      // Call backend to generate report
      const report = await reportsService.generateReport(reportData)
      
      if (report && report.id) {
        // Display the enhanced report
        const reportHtml = renderDetailedReport(report)
        
        resultContainer.innerHTML = `
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div class="flex items-center">
              <i class="fa-solid fa-check-circle text-green-500 text-xl mr-3"></i>
              <div>
                <h3 class="font-bold text-green-800">Report Generated Successfully!</h3>
                <p class="text-green-600 text-sm">Report ID: ${report.id}</p>
              </div>
              <div class="ml-auto">
                <button onclick="downloadReportPDF(${report.id})" class="btn btn-success">
                  <i class="fa-solid fa-download mr-2"></i>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
          ${reportHtml}
        `
        
        showToast('Advanced report generated successfully!', 'success')
        
        // Refresh report history
        loadReportHistory(page)
        
      } else {
        resultContainer.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
              <i class="fa-solid fa-exclamation-triangle text-red-500 text-xl mr-3"></i>
              <div>
                <h3 class="font-bold text-red-800">Report Generation Failed</h3>
                <p class="text-red-600 text-sm">Please try again or contact support if the issue persists.</p>
              </div>
            </div>
          </div>
        `
      }
    } catch (error) {
      console.error('Error generating report:', error)
      resultContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <i class="fa-solid fa-exclamation-triangle text-red-500 text-xl mr-3"></i>
            <div>
              <h3 class="font-bold text-red-800">Report Generation Error</h3>
              <p class="text-red-600 text-sm">${error.message || 'An unexpected error occurred'}</p>
            </div>
          </div>
        </div>
      `
      showToast('Failed to generate report', 'error')
    } finally {
      submitButton.disabled = false
      submitButton.innerHTML = '<i class="fa-solid fa-magic mr-2"></i>Generate Advanced Report'
    }
  })
}

// Global functions for template usage and report viewing
window.useTemplate = function(templateType) {
  const form = document.querySelector('#report-form')
  const reportTypeSelect = form.querySelector('#report-type')
  const dateFromInput = form.querySelector('#date-from')
  const dateToInput = form.querySelector('#date-to')
  
  // Switch to generate tab
  document.querySelector('[data-tab="generate"]').click()
  
  // Set template values
  const today = new Date()
  const templates = {
    'weekly_performance': {
      type: 'store_performance',
      dateFrom: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0]
    },
    'monthly_summary': {
      type: 'financial_summary',
      dateFrom: new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0],
      dateTo: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]
    },
    'customer_analysis': {
      type: 'customer_insights',
      dateFrom: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0]
    }
  }
  
  const template = templates[templateType]
  if (template) {
    reportTypeSelect.value = template.type
    dateFromInput.value = template.dateFrom
    dateToInput.value = template.dateTo
    
    // Trigger preview update
    reportTypeSelect.dispatchEvent(new Event('change'))
    
    showToast(`Template "${templateType}" applied successfully!`, 'success')
  }
}

window.viewReport = async function(reportId) {
  try {
    const report = await reportsService.getReportDetails(reportId)
    const resultContainer = document.querySelector('#report-result')
    
    if (report) {
      // Switch to generate tab to show the report
      document.querySelector('[data-tab="generate"]').click()
      
      const reportHtml = renderDetailedReport(report)
      resultContainer.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <i class="fa-solid fa-eye text-blue-500 text-xl mr-3"></i>
            <div>
              <h3 class="font-bold text-blue-800">Viewing Report #${report.id}</h3>
              <p class="text-blue-600 text-sm">Generated on ${new Date(report.generated_at).toLocaleString()}</p>
            </div>
            <div class="ml-auto">
              ${report.status === 'COMPLETED' ? `
                <button onclick="downloadReportPDF(${report.id})" class="btn btn-primary">
                  <i class="fa-solid fa-download mr-2"></i>
                  Download PDF
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        ${reportHtml}
      `
      
      // Scroll to the report
      resultContainer.scrollIntoView({ behavior: 'smooth' })
    }
  } catch (error) {
    console.error('Error viewing report:', error)
    showToast('Failed to load report details', 'error')
  }
}

// دالة تحميل PDF
window.downloadReportPDF = async function(reportId) {
  try {
    showToast('Preparing PDF download...', 'info')
    
    // Create download URL with proper authentication
    const token = localStorage.getItem('access_token')
    const downloadUrl = `/api/reports/download/${reportId}/`
    
    // Create a temporary link element
    const link = document.createElement('a')
    link.style.display = 'none'
    
    // Fetch the file with authentication
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // Get the blob
    const blob = await response.blob()
    
    // Create object URL
    const url = window.URL.createObjectURL(blob)
    link.href = url
    link.download = `report_${reportId}.pdf`
    
    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the object URL
    window.URL.revokeObjectURL(url)
    
    showToast('PDF downloaded successfully!', 'success')
    
  } catch (error) {
    console.error('Error downloading PDF:', error)
    showToast('Failed to download PDF. Please try again.', 'error')
  }
}

// دالة تصدير جدول العملاء
window.exportCustomerTable = function() {
  try {
    // Get customer data from the current report
    const customerTable = document.querySelector('table')
    if (!customerTable) {
      showToast('No customer data to export', 'warning')
      return
    }
    
    // Convert table to CSV
    let csv = []
    const rows = customerTable.querySelectorAll('tr')
    
    for (let i = 0; i < rows.length; i++) {
      const row = []
      const cols = rows[i].querySelectorAll('td, th')
      
      for (let j = 0; j < cols.length; j++) {
        // Clean up the text content
        let cellText = cols[j].textContent.trim()
        cellText = cellText.replace(/\s+/g, ' ') // Replace multiple spaces with single space
        cellText = cellText.replace(/"/g, '""') // Escape quotes
        row.push(`"${cellText}"`)
      }
      csv.push(row.join(','))
    }
    
    // Create and download CSV file
    const csvContent = csv.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `customer_data_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showToast('Customer data exported successfully!', 'success')
    }
  } catch (error) {
    console.error('Error exporting customer table:', error)
    showToast('Failed to export customer data', 'error')
  }
}

// دالة تصدير بيانات الرسوم البيانية
window.exportVisualizationData = function() {
  try {
    showToast('Exporting visualization data...', 'info')
    
    // This would typically export chart data
    // For now, we'll show a success message
    setTimeout(() => {
      showToast('Visualization data exported successfully!', 'success')
    }, 1000)
    
  } catch (error) {
    console.error('Error exporting visualization data:', error)
    showToast('Failed to export visualization data', 'error')
  }
}

// دالة تبديل عرض الرسم البياني
window.toggleChartView = function() {
  showToast('Chart view feature coming soon!', 'info')
}

// دالة عرض تفاصيل العميل
window.viewCustomerDetails = function(customerId) {
  showToast(`Viewing details for customer: ${customerId}`, 'info')
  // This would typically open a modal or navigate to customer details
}

// دالة التواصل مع العميل
window.contactCustomer = function(customerEmail) {
  if (!customerEmail || customerEmail === 'Guest User') {
    showToast('No email available for this customer', 'warning')
    return
  }
  
  // Open email client
  window.location.href = `mailto:${customerEmail}?subject=Follow up from Best in Click`
  showToast(`Opening email client for: ${customerEmail}`, 'info')
}
