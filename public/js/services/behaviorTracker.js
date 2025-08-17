/**
 * Behavior Tracker Service
 * Tracks user interactions for AI-powered recommendations
 */

import { recommendationService } from './api.js';

class BehaviorTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.viewStartTime = null;
        this.isTracking = true;
        this.pendingEvents = [];
        this.batchSize = 10;
        this.flushInterval = 5000; // 5 seconds
        
        this.initializeTracking();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    initializeTracking() {
        // Auto-flush pending events periodically
        setInterval(() => {
            this.flushPendingEvents();
        }, this.flushInterval);

        // Flush events before page unload
        window.addEventListener('beforeunload', () => {
            this.flushPendingEvents(true);
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.flushPendingEvents();
            }
        });
    }

    /**
     * Track product view
     */
    trackProductView(productId, duration = null) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'view',
            product_id: productId,
            duration_seconds: duration,
            referrer_page: document.referrer || window.location.pathname
        });
    }

    /**
     * Track product like/unlike
     */
    trackProductLike(productId, isLike = true) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: isLike ? 'like' : 'unlike',
            product_id: productId
        });
    }

    /**
     * Track add to cart
     */
    trackAddToCart(productId) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'cart_add',
            product_id: productId
        });
    }

    /**
     * Track remove from cart
     */
    trackRemoveFromCart(productId) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'cart_remove',
            product_id: productId
        });
    }

    /**
     * Track purchase
     */
    trackPurchase(productId) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'purchase',
            product_id: productId
        });
    }

    /**
     * Track wishlist actions
     */
    trackWishlistAdd(productId) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'wishlist_add',
            product_id: productId
        });
    }

    trackWishlistRemove(productId) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'wishlist_remove',
            product_id: productId
        });
    }

    /**
     * Track product share
     */
    trackProductShare(productId) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'share',
            product_id: productId
        });
    }

    /**
     * Track product comparison
     */
    trackProductCompare(productId) {
        if (!this.isTracking || !productId) return;

        this.trackBehavior({
            behavior_type: 'compare',
            product_id: productId
        });
    }

    /**
     * Track search behavior
     */
    trackSearch(productId, searchQuery) {
        if (!this.isTracking || !productId || !searchQuery) return;

        this.trackBehavior({
            behavior_type: 'search',
            product_id: productId,
            search_query: searchQuery
        });
    }

    /**
     * Track review with sentiment
     */
    trackReview(productId, rating, sentiment = null) {
        if (!this.isTracking || !productId) return;

        const behaviorType = sentiment > 0 ? 'review_positive' : 
                           sentiment < 0 ? 'review_negative' : 
                           rating >= 4 ? 'review_positive' : 'review_negative';

        this.trackBehavior({
            behavior_type: behaviorType,
            product_id: productId,
            rating: rating,
            review_sentiment: sentiment
        });
    }

    /**
     * Start tracking view duration
     */
    startViewTracking(productId) {
        this.currentProductId = productId;
        this.viewStartTime = Date.now();
    }

    /**
     * End tracking view duration
     */
    endViewTracking() {
        if (this.viewStartTime && this.currentProductId) {
            const duration = Math.floor((Date.now() - this.viewStartTime) / 1000);
            if (duration > 0) {
                this.trackProductView(this.currentProductId, duration);
            }
        }
        this.viewStartTime = null;
        this.currentProductId = null;
    }

    /**
     * Generic behavior tracking method
     */
    trackBehavior(behaviorData) {
        if (!this.isTracking) return;

        const event = {
            ...behaviorData,
            session_id: this.sessionId,
            timestamp: new Date().toISOString()
        };

        // Add to pending events
        this.pendingEvents.push(event);

        // Flush if batch is full
        if (this.pendingEvents.length >= this.batchSize) {
            this.flushPendingEvents();
        }
    }

    /**
     * Send pending events to backend
     */
    async flushPendingEvents(isSync = false) {
        if (this.pendingEvents.length === 0) return;

        const events = [...this.pendingEvents];
        this.pendingEvents = [];

        try {
            if (isSync) {
                // Use sendBeacon for synchronous sending (page unload)
                const data = JSON.stringify({ events });
                navigator.sendBeacon('/api/recommendations/track-behavior/', data);
            } else {
                // Send events one by one (or implement batch endpoint)
                for (const event of events) {
                    await this.sendBehaviorEvent(event);
                }
            }
        } catch (error) {
            console.warn('Failed to send behavior events:', error);
            // Re-add failed events to pending (with limit to prevent memory issues)
            if (this.pendingEvents.length < 100) {
                this.pendingEvents.unshift(...events);
            }
        }
    }

    /**
     * Send single behavior event
     */
    async sendBehaviorEvent(eventData) {
        try {
            await recommendationService.trackBehavior(eventData);
        } catch (error) {
            console.warn('Failed to send behavior event:', error);
            throw error;
        }
    }

    /**
     * Enable/disable tracking
     */
    setTracking(enabled) {
        this.isTracking = enabled;
        if (!enabled) {
            this.flushPendingEvents();
        }
    }

    /**
     * Get current session ID
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Auto-track common DOM events
     */
    autoTrackEvents() {
        // Track clicks on product cards
        document.addEventListener('click', (event) => {
            const productCard = event.target.closest('[data-product-id]');
            if (productCard) {
                const productId = parseInt(productCard.dataset.productId);
                if (productId) {
                    this.trackProductView(productId);
                }
            }

            // Track add to cart buttons
            const addToCartBtn = event.target.closest('[data-action="add-to-cart"]');
            if (addToCartBtn) {
                const productId = parseInt(addToCartBtn.dataset.productId);
                if (productId) {
                    this.trackAddToCart(productId);
                }
            }

            // Track like buttons
            const likeBtn = event.target.closest('[data-action="like"]');
            if (likeBtn) {
                const productId = parseInt(likeBtn.dataset.productId);
                const isLike = !likeBtn.classList.contains('liked');
                if (productId) {
                    this.trackProductLike(productId, isLike);
                }
            }

            // Track wishlist buttons
            const wishlistBtn = event.target.closest('[data-action="wishlist"]');
            if (wishlistBtn) {
                const productId = parseInt(wishlistBtn.dataset.productId);
                const isAdd = !wishlistBtn.classList.contains('in-wishlist');
                if (productId) {
                    if (isAdd) {
                        this.trackWishlistAdd(productId);
                    } else {
                        this.trackWishlistRemove(productId);
                    }
                }
            }
        });

        // Track page views for product pages
        if (window.location.pathname.includes('/product/')) {
            const productId = this.extractProductIdFromUrl();
            if (productId) {
                this.startViewTracking(productId);
                
                // End tracking when leaving page
                window.addEventListener('beforeunload', () => {
                    this.endViewTracking();
                });
            }
        }
    }

    /**
     * Extract product ID from URL
     */
    extractProductIdFromUrl() {
        const match = window.location.pathname.match(/\/product\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }
}

// Create global instance
const behaviorTracker = new BehaviorTracker();

/**
 * Initialize behavior tracker
 * This function is called from main.js to start tracking
 */
function initBehaviorTracker() {
    // Auto-start tracking common events
    behaviorTracker.autoTrackEvents();
    
    console.log('Behavior tracker initialized with session:', behaviorTracker.getSessionId());
    
    return behaviorTracker;
}

export { behaviorTracker, initBehaviorTracker };