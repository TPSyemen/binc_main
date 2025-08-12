#!/usr/bin/env python
"""
Quick script to fix sentiment analysis for existing comments.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'best_on_click.settings')
django.setup()

from comments.models import Comment, AISentimentAnalysisResult
import random

def create_sentiment_analysis():
    """Create sentiment analysis for comments that don't have it."""
    
    # Get all comments without sentiment analysis
    comments = Comment.objects.filter(sentiment_analysis__isnull=True)
    print(f"Found {comments.count()} comments without sentiment analysis")
    
    # Sentiment mapping based on rating
    sentiment_mapping = {
        1: ('negative', 0.9),
        2: ('negative', 0.7),
        3: ('neutral', 0.6),
        4: ('positive', 0.7),
        5: ('positive', 0.9)
    }
    
    created_count = 0
    for comment in comments:
        try:
            base_sentiment, base_confidence = sentiment_mapping[comment.rating]
            confidence = max(0.1, min(1.0, base_confidence + random.uniform(-0.2, 0.2)))
            
            # Simple emotion scores
            emotion_scores = {}
            if base_sentiment == 'positive':
                emotion_scores = {'joy': 0.8, 'satisfaction': 0.7}
            elif base_sentiment == 'negative':
                emotion_scores = {'anger': 0.7, 'disappointment': 0.6}
            else:
                emotion_scores = {'neutral': 0.6}
            
            # Extract some keywords
            words = comment.text.lower().split()
            keywords = [word for word in words if len(word) > 4 and word.isalpha()][:5]
            
            AISentimentAnalysisResult.objects.create(
                comment=comment,
                sentiment=base_sentiment,
                confidence_score=confidence,
                emotion_scores=emotion_scores,
                keywords=keywords
            )
            created_count += 1
            
        except Exception as e:
            print(f"Error creating sentiment for comment {comment.id}: {e}")
    
    print(f"✅ Created {created_count} sentiment analysis results")

if __name__ == "__main__":
    create_sentiment_analysis()
