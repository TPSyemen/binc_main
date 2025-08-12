import { showToast } from "../utils/helpers.js?v=2024"

/**
 * Renders the application footer.
 * @param {HTMLElement} container - The container element to render the footer into.
 */
export function renderFooter(container) {
  const html = `
        <div class="bg-primary text-white">
            <div class="container mx-auto px-4 py-12">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    <!-- Column 1: Brand -->
                    <div class="lg:col-span-1">
                        <div class="flex items-center gap-2 mb-4">
                            <div class="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm">
                                <i class="fa-solid fa-shopping-bag"></i>
                            </div>
                            <h3 class="text-2xl font-bold">Best in Click</h3>
                        </div>
                        <p class="text-sm text-gray-300 mb-4">Your one-stop shop for the best deals online with AI-powered recommendations.</p>
                        <div class="flex gap-3">
                            <a href="#" class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
                                <i class="fa-brands fa-facebook-f text-sm"></i>
                            </a>
                            <a href="#" class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
                                <i class="fa-brands fa-twitter text-sm"></i>
                            </a>
                            <a href="#" class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
                                <i class="fa-brands fa-instagram text-sm"></i>
                            </a>
                            <a href="#" class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
                                <i class="fa-brands fa-linkedin-in text-sm"></i>
                            </a>
                        </div>
                    </div>
                    <!-- Column 2: Company -->
                    <div>
                        <h4 class="font-bold mb-4">Company</h4>
                        <ul class="space-y-3 text-sm text-gray-300">
                            <li><a href="#/about" class="hover:text-secondary transition-colors">About Us</a></li>
                            <li><a href="#/careers" class="hover:text-secondary transition-colors">Careers</a></li>
                            <li><a href="#/blog" class="hover:text-secondary transition-colors">Blog</a></li>
                            <li><a href="#/contact" class="hover:text-secondary transition-colors">Contact Us</a></li>
                        </ul>
                    </div>
                    <!-- Column 3: Customer Service -->
                    <div>
                        <h4 class="font-bold mb-4">Customer Service</h4>
                        <ul class="space-y-3 text-sm text-gray-300">
                            <li><a href="#/help" class="hover:text-secondary transition-colors">Help Center</a></li>
                            <li><a href="#/returns" class="hover:text-secondary transition-colors">Returns & Exchanges</a></li>
                            <li><a href="#/shipping" class="hover:text-secondary transition-colors">Shipping Info</a></li>
                            <li><a href="#/support" class="hover:text-secondary transition-colors">24/7 Support</a></li>
                        </ul>
                    </div>
                    <!-- Column 4: Categories -->
                    <div>
                        <h4 class="font-bold mb-4">Popular Categories</h4>
                        <ul class="space-y-3 text-sm text-gray-300">
                            <li><a href="#/products?category=Phones" class="hover:text-secondary transition-colors">Smartphones</a></li>
                            <li><a href="#/products?category=Computers" class="hover:text-secondary transition-colors">Laptops</a></li>
                            <li><a href="#/products?category=Gaming" class="hover:text-secondary transition-colors">Gaming</a></li>
                            <li><a href="#/products?category=HeadPhones" class="hover:text-secondary transition-colors">Audio</a></li>
                        </ul>
                    </div>
                    <!-- Column 5: Newsletter -->
                    <div>
                        <h4 class="font-bold mb-4">Stay Updated</h4>
                        <p class="text-sm text-gray-300 mb-4">Subscribe to get special offers, free giveaways, and exclusive deals.</p>
                        <div class="flex items-center border border-gray-600 rounded-md overflow-hidden mb-4">
                            <input type="email" placeholder="Your Email" class="bg-gray-100 text-primary px-4 py-2 w-full focus:outline-none" id="newsletter-email">
                            <button class="bg-secondary text-white px-4 py-2 shrink-0 hover:bg-blue-600 transition-colors" onclick="subscribeNewsletter()">
                                Subscribe
                            </button>
                        </div>
                        <div class="text-xs text-gray-400 space-y-1">
                            <p><i class="fa-solid fa-phone mr-2"></i>776468322</p>
                            <p><i class="fa-solid fa-envelope mr-2"></i>ttt.ppp.sss.77@gmail.com</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-light-gray py-4">
                <div class="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-muted text-sm">
                    <div class="mb-2 md:mb-0">
                        <p>&copy; 2024 Best in Click. All rights reserved.</p>
                    </div>
                    <div class="flex gap-4">
                        <a href="#/privacy" class="hover:text-secondary transition-colors">Privacy Policy</a>
                        <a href="#/terms" class="hover:text-secondary transition-colors">Terms of Service</a>
                        <a href="#/cookies" class="hover:text-secondary transition-colors">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </div>
    `

  container.innerHTML = html

  // Add newsletter subscription functionality
  window.subscribeNewsletter = function() {
    const emailInput = document.getElementById('newsletter-email')
    const email = emailInput.value.trim()

    if (!email) {
      showToast('Please enter your email address', 'error')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address', 'error')
      return
    }

    // Simulate newsletter subscription
    showToast('Thank you for subscribing to our newsletter!', 'success')
    emailInput.value = ''
  }

  // Add enter key support for newsletter subscription
  const newsletterInput = document.getElementById('newsletter-email')
  if (newsletterInput) {
    newsletterInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        window.subscribeNewsletter()
      }
    })
  }
}
