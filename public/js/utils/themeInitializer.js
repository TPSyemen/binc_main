/**
 * Theme and Language Initializer
 * This script runs immediately to prevent flash of unstyled content
 */

(function() {
  // Get theme and language preferences from localStorage
  const theme = localStorage.getItem('theme') || 'light';
  const language = localStorage.getItem('language') || 'en';
  
  // Apply theme immediately
  if (theme === 'dark') {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  
  // Apply language immediately
  if (language === 'ar') {
    document.documentElement.classList.add('rtl', 'lang-ar');
    document.documentElement.setAttribute('lang', 'ar');
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.classList.remove('rtl', 'lang-ar');
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('dir', 'ltr');
  }
})();