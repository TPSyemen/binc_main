import { createElementFromHTML } from "../utils/helpers.js"

export default function NotFoundPage() {
  return createElementFromHTML(`
        <div class="container mx-auto px-4 py-20 text-center">
            <div class="max-w-md mx-auto">
                <!-- 404 Animation -->
                <div class="text-8xl font-extrabold text-primary mb-4 animate-pulse">
                    4<span class="text-secondary">0</span>4
                </div>

                <!-- Error Message -->
                <h1 class="text-3xl font-bold text-gray-900 mb-4">Oops! Page Not Found</h1>
                <p class="text-muted mb-8 leading-relaxed">
                    The page you're looking for seems to have wandered off.
                    Don't worry, even the best explorers sometimes take a wrong turn!
                </p>

                <!-- Helpful Actions -->
                <div class="space-y-4">
                    <a href="#/" class="btn btn-primary w-full">
                        <i class="fa-solid fa-home mr-2"></i>
                        Back to Homepage
                    </a>
                    <a href="#/products" class="btn btn-outline w-full">
                        <i class="fa-solid fa-shopping-bag mr-2"></i>
                        Browse Products
                    </a>
                </div>

                <!-- Search Suggestion -->
                <div class="mt-8 p-4 bg-light-gray rounded-lg">
                    <p class="text-sm text-muted mb-3">Looking for something specific?</p>
                    <div class="flex gap-2">
                        <input type="search" placeholder="Search products..." class="input-field flex-1">
                        <button class="btn btn-secondary">
                            <i class="fa-solid fa-search"></i>
                        </button>
                    </div>
                </div>

                <!-- Popular Links -->
                <div class="mt-8">
                    <p class="text-sm text-muted mb-4">Popular pages:</p>
                    <div class="flex flex-wrap justify-center gap-2">
                        <a href="#/products" class="text-secondary hover:underline text-sm">All Products</a>
                        <span class="text-gray-300">•</span>
                        <a href="#/login" class="text-secondary hover:underline text-sm">Login</a>
                        <span class="text-gray-300">•</span>
                        <a href="#/register" class="text-secondary hover:underline text-sm">Register</a>
                    </div>
                </div>
            </div>
        </div>
    `)
}
