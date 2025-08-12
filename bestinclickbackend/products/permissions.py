"""
Custom permissions for products app.
"""

from rest_framework import permissions


class IsStoreOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow store owners to edit their own products.
    """
    
    def has_permission(self, request, view):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for authenticated store owners
        return request.user.is_authenticated and request.user.is_store_owner
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for the store owner
        return obj.store.owner == request.user


class IsStoreOwner(permissions.BasePermission):
    """
    Permission to only allow store owners.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_store_owner
