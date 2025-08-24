import { createElementFromHTML, showToast } from "../utils/helpers.js"

export default function ContactPage() {
  const page = createElementFromHTML(`
        <div class="container mx-auto px-4 py-8">
            <!-- Header -->
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-primary mb-4">Contact Us</h1>
                <p class="text-xl text-muted max-w-2xl mx-auto">
                    We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <!-- Contact Form -->
                <div class="card">
                    <h2 class="text-2xl font-bold mb-6">Send us a Message</h2>
                    <form id="contact-form" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="first_name" class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                                <input type="text" id="first_name" name="first_name" required class="input-field">
                            </div>
                            <div>
                                <label for="last_name" class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                                <input type="text" id="last_name" name="last_name" required class="input-field">
                            </div>
                        </div>
                        
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input type="email" id="email" name="email" required class="input-field">
                        </div>
                        
                        <div>
                            <label for="subject" class="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <select id="subject" name="subject" class="input-field">
                                <option value="">Select a subject</option>
                                <option value="general">General Inquiry</option>
                                <option value="support">Technical Support</option>
                                <option value="billing">Billing Question</option>
                                <option value="partnership">Partnership</option>
                                <option value="feedback">Feedback</option>
                            </select>
                        </div>
                        
                        <div>
                            <label for="message" class="block text-sm font-medium text-gray-700 mb-2">Message</label>
                            <textarea id="message" name="message" rows="6" required class="input-field resize-none" placeholder="Tell us how we can help you..."></textarea>
                        </div>
                        
                        <button type="submit" class="btn btn-primary w-full">
                            <i class="fa-solid fa-paper-plane mr-2"></i>
                            Send Message
                        </button>
                    </form>
                </div>

                <!-- Contact Information -->
                <div class="space-y-8">
                    <!-- Contact Details -->
                    <div class="card">
                        <h2 class="text-2xl font-bold mb-6">Get in Touch</h2>
                        <div class="space-y-4">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white">
                                    <i class="fa-solid fa-phone"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold">Phone</h3>
                                    <p class="text-muted">776468322</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white">
                                    <i class="fa-solid fa-envelope"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold">Email</h3>
                                    <p class="text-muted">ttt.ppp.sss.77@gmail.com.com</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-success rounded-full flex items-center justify-center text-white">
                                    <i class="fa-solid fa-map-marker-alt"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold">Address</h3>
                                    <p class="text-muted">Yemen<br>Trime</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Business Hours -->
                    <div class="card">
                        <h2 class="text-2xl font-bold mb-6">Business Hours</h2>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="font-medium">Monday - Friday</span>
                                <span class="text-muted">9:00 AM - 6:00 PM</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium">Saturday</span>
                                <span class="text-muted">10:00 AM - 4:00 PM</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="font-medium">Sunday</span>
                                <span class="text-muted">Closed</span>
                            </div>
                        </div>
                        <div class="mt-4 p-3 bg-light-gray rounded">
                            <p class="text-sm text-muted">
                                <i class="fa-solid fa-info-circle mr-2"></i>
                                Our customer support team is available 24/7 through our online chat system.
                            </p>
                        </div>
                    </div>

                    <!-- FAQ Link -->
                    <div class="card text-center">
                        <h3 class="text-xl font-bold mb-4">Need Quick Answers?</h3>
                        <p class="text-muted mb-4">Check out our frequently asked questions for instant help.</p>
                        <a href="#/faq" class="btn btn-outline">
                            <i class="fa-solid fa-question-circle mr-2"></i>
                            Visit FAQ
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `)

  // Handle form submission
  const form = page.querySelector('#contact-form')
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    
    const formData = new FormData(form)
    const data = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message')
    }
    
    // Validate required fields
    if (!data.first_name || !data.last_name || !data.email || !data.message) {
      showToast('Please fill in all required fields', 'error')
      return
    }
    
    // Simulate form submission
    showToast('Thank you for your message! We\'ll get back to you soon.', 'success')
    form.reset()
  })

  return page
}
