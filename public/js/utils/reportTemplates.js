/**
 * Report Templates Utility
 * Handles the usage of report templates with language support
 */
import { translate } from './translations.js';
import store from '../state/store.js';
import { showToast } from './helpers.js?v=2024';
import { reportsService } from '../services/api.js';

/**
 * Use a report template to generate a report
 * @param {string} templateId - The ID of the template to use
 */
export function useTemplate(templateId) {
  const { language } = store.getState();
  const t = (key) => translate(key, language);
  
  // Get current date
  const today = new Date();
  
  // Calculate dates based on template
  let fromDate, toDate;
  
  if (templateId === 'weekly_performance') {
    // Last 7 days
    fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 7);
    toDate = today;
  } else if (templateId === 'monthly_summary') {
    // Last 30 days
    fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 30);
    toDate = today;
  } else if (templateId === 'customer_analysis') {
    // Last 14 days
    fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 14);
    toDate = today;
  } else {
    // Default to last 7 days
    fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 7);
    toDate = today;
  }
  
  // Format dates for input fields
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Map template IDs to report types
  const reportTypeMap = {
    'weekly_performance': 'store_performance',
    'monthly_summary': 'financial_summary',
    'customer_analysis': 'customer_insights'
  };
  
  // Set form values
  const reportForm = document.getElementById('report-form');
  if (reportForm) {
    const reportTypeSelect = reportForm.querySelector('#report-type');
    const dateFromInput = reportForm.querySelector('#date-from');
    const dateToInput = reportForm.querySelector('#date-to');
    
    if (reportTypeSelect && dateFromInput && dateToInput) {
      reportTypeSelect.value = reportTypeMap[templateId] || 'store_performance';
      dateFromInput.value = formatDate(fromDate);
      dateToInput.value = formatDate(toDate);
      
      // Trigger change event to update preview
      reportTypeSelect.dispatchEvent(new Event('change'));
      
      // Show toast notification
      showToast(t('templateApplied'), 'success');
      
      // Switch to generate tab
      const generateTabButton = document.querySelector('.tab-button[data-tab="generate"]');
      if (generateTabButton) {
        generateTabButton.click();
      }
    }
  }
}

// Add translations for template usage
const templateTranslations = {
  en: {
    templateApplied: "Template applied successfully!",
  },
  ar: {
    templateApplied: "تم تطبيق القالب بنجاح!",
  }
};

// Make the function globally available
window.useTemplate = useTemplate;

export default useTemplate;