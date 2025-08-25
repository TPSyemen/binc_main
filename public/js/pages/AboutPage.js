import { createElementFromHTML } from "../utils/helpers.js"

export default function AboutPage() {
  return createElementFromHTML(`
        <div class="container mx-auto px-4 py-8">
            <!-- Hero Section -->
            <div class="text-center mb-12">
                <h1 class="text-4xl font-bold text-primary mb-4">About Best in Click</h1>
                <p class="text-xl text-muted max-w-3xl mx-auto">
                    We're revolutionizing online shopping with AI-powered recommendations and the best deals on the internet.
                </p>
            </div>

            <!-- Mission & Vision -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div class="card">
                    <div class="text-4xl text-secondary mb-4">
                        <i class="fa-solid fa-bullseye"></i>
                    </div>
                    <h2 class="text-2xl font-bold mb-4">Our Mission</h2>
                    <p class="text-muted leading-relaxed">
                        To make online shopping smarter, faster, and more personalized by leveraging cutting-edge AI technology 
                        to help customers find exactly what they need at the best prices.
                    </p>
                </div>
                
                <div class="card">
                    <div class="text-4xl text-primary mb-4">
                        <i class="fa-solid fa-eye"></i>
                    </div>
                    <h2 class="text-2xl font-bold mb-4">Our Vision</h2>
                    <p class="text-muted leading-relaxed">
                        To become the world's most trusted e-commerce platform where every click leads to the perfect product, 
                        creating a seamless shopping experience for millions of customers worldwide.
                    </p>
                </div>
            </div>

            <!-- Features -->
            <div class="mb-12">
                <h2 class="text-3xl font-bold text-center mb-8">Why Choose Us?</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                            <i class="fa-solid fa-robot"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">AI-Powered</h3>
                        <p class="text-muted">Smart recommendations based on your preferences and behavior</p>
                    </div>
                    
                    <div class="text-center">
                        <div class="w-16 h-16 bg-success rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                            <i class="fa-solid fa-shield-check"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Secure Shopping</h3>
                        <p class="text-muted">Your data and transactions are protected with enterprise-grade security</p>
                    </div>
                    
                    <div class="text-center">
                        <div class="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                            <i class="fa-solid fa-shipping-fast"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Fast Delivery</h3>
                        <p class="text-muted">Quick and reliable shipping to get your products when you need them</p>
                    </div>
                </div>
            </div>

            <!-- Team Section -->
            <div class="mb-12">
                <h2 class="text-3xl font-bold text-center mb-8">Our Team</h2>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div class="card text-center"> 
                        <div class="w-24 h-24 bg-secondary rounded-full mx-auto mb-4 overflow-hidden"> 
                            <img src="/assets/1.jpg" alt="Mugahed Ahmed" class="w-full h-full object-cover"> 
                        </div>
                        <h3 class="text-xl font-bold mb-2">MUGAHED AHMED</h3>
                    </div>
                    
                    <div class="card text-center">
                        <div class="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Khalid Badhawi</h3> 
                    </div>
                    
                    <div class="card text-center"> 
                         <div class="w-24 h-24 bg-secondary rounded-full mx-auto mb-4 overflow-hidden"> 
                            <img src="/assets/3.jpg" alt="" class="w-full h-full object-cover"> 
                        </div>
                        <h3 class="text-xl font-bold mb-2">OSAMA BAHSHWAN</h3>
                    </div>

                    <div class="card text-center"> 
                         <div class="w-24 h-24 bg-secondary rounded-full mx-auto mb-4 overflow-hidden"> 
                            <img src="/assets/2.jpg" alt="" class="w-full h-full object-cover"> 
                        </div>
                        <h3 class="text-xl font-bold mb-2">Ebrahim Ba_Haggag</h3>
                    </div>
                </div>
            </div>

            <!-- Call to Action -->
            <div class="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8">
                <h2 class="text-3xl font-bold text-primary mb-4">Ready to Start Shopping?</h2>
                <p class="text-muted mb-6">Join millions of satisfied customers and discover the future of online shopping.</p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="#/products" class="btn btn-primary">
                        <i class="fa-solid fa-shopping-bag mr-2"></i>
                        Browse Products
                    </a>
                    <a href="#/register" class="btn btn-outline">
                        <i class="fa-solid fa-user-plus mr-2"></i>
                        Create Account
                    </a>
                </div>
            </div>
        </div>
    `)
}
