# Product Reviews and Images Population Guide

This guide explains how to use the `populate_reviews_and_images` Django management command to add sample product reviews and images to your database for testing purposes.

## Prerequisites

1. **Existing Products**: Make sure you have products in your database. If not, run the main population command first:
   ```bash
   python manage.py populate_db --count 20
   ```

2. **Virtual Environment**: Ensure your virtual environment is activated:
   ```bash
   # Windows
   .\venv\Scripts\Activate.ps1
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Dependencies**: The command requires the Faker library (should already be installed):
   ```bash
   pip install Faker
   ```

## Command Usage

### Basic Syntax
```bash
python manage.py populate_reviews_and_images [options]
```

### Available Options

- `--reviews NUMBER`: Number of reviews to create (default: 50)
- `--clear-reviews`: Clear existing reviews before populating
- `--add-images`: Add product images from placeholder services
- `--create-users`: Create additional test users for reviews

### Usage Examples

#### 1. Basic Usage - Create 50 Reviews
```bash
python manage.py populate_reviews_and_images
```

#### 2. Create 100 Reviews and Clear Existing Ones
```bash
python manage.py populate_reviews_and_images --reviews 100 --clear-reviews
```

#### 3. Full Setup with Everything
```bash
python manage.py populate_reviews_and_images --reviews 75 --add-images --create-users
```

#### 4. Only Add Images to Existing Products
```bash
python manage.py populate_reviews_and_images --add-images --reviews 0
```

#### 5. Create Many Reviews with Fresh Start
```bash
python manage.py populate_reviews_and_images --reviews 200 --clear-reviews --add-images --create-users
```

## What the Command Creates

### 📝 Product Reviews
- **Realistic review text** based on rating (1-5 stars)
- **Weighted rating distribution** (more positive reviews)
- **Mix of verified and non-verified purchases**
- **Varied review lengths and styles**
- **Proper user associations**

### 👍 Helpfulness Voting System
- **Random helpfulness votes** on reviews
- **Realistic voting patterns** (80% helpful, 20% not helpful)
- **Avoids self-voting**
- **Updates helpful vote counts**

### 🤖 AI Sentiment Analysis
- **Sentiment classification** (positive, negative, neutral)
- **Confidence scores** with realistic variation
- **Emotion analysis** with keyword detection
- **Keyword extraction** from review text

### 🖼️ Product Images
- **Multiple images per product** (2-5 images)
- **Category-appropriate placeholders**
- **Various placeholder services** for variety
- **ProductImage model integration**

### 👥 Test Users
- **Additional customer accounts** for diverse reviews
- **Complete user profiles** with realistic data
- **Proper role assignments**

## Sample Review Templates

The command includes realistic review templates for each rating:

- **5 Stars**: "Absolutely amazing product! Exceeded all my expectations..."
- **4 Stars**: "Great product overall. Minor issues but still very satisfied..."
- **3 Stars**: "Average product. Does the job but nothing special..."
- **2 Stars**: "Disappointing product. Several issues and poor quality..."
- **1 Star**: "Terrible product! Complete waste of money. Do not buy!"

## Database Impact

### Tables Affected
- `comments` - Product reviews
- `comment_helpfulness` - Helpfulness votes
- `ai_sentiment_analysis` - AI analysis results
- `product_images` - Product image records
- `products` - Updated review statistics
- `users` - Additional test users (if --create-users)
- `user_profiles` - User profile data

### Safety Features
- **Unique constraints respected** (one review per user per product)
- **Transaction safety** (all-or-nothing execution)
- **Error handling** with detailed feedback
- **Progress reporting** during execution

## Troubleshooting

### Common Issues

1. **No products found**
   ```
   ⚠️  No products found. Please run populate_db first.
   ```
   **Solution**: Run `python manage.py populate_db` first

2. **No customer users found**
   ```
   ⚠️  No customer users found. Creating some...
   ```
   **Solution**: Use `--create-users` flag or run populate_db

3. **Faker not installed**
   ```
   Faker library is required. Install it with: pip install Faker
   ```
   **Solution**: `pip install Faker`

### Verification

After running the command, verify the data:

```python
# Django shell
python manage.py shell

# Check review counts
from comments.models import Comment
print(f"Total reviews: {Comment.objects.count()}")

# Check sentiment analysis
from comments.models import AISentimentAnalysisResult
print(f"Sentiment analyses: {AISentimentAnalysisResult.objects.count()}")

# Check product images
from products.models import ProductImage
print(f"Product images: {ProductImage.objects.count()}")
```

## Performance Notes

- **Execution time**: ~30 seconds for 100 reviews
- **Memory usage**: Minimal (uses database transactions)
- **Network usage**: Only for placeholder images (if --add-images)

## Next Steps

After populating reviews and images:

1. **Test frontend display** of reviews and ratings
2. **Verify sentiment analysis** functionality
3. **Check image galleries** on product pages
4. **Test filtering and sorting** by ratings
5. **Validate helpfulness voting** system

This command provides comprehensive test data for developing and testing your e-commerce platform's review and image functionality.
