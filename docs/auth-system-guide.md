# Sophisticated Auth System Guide

## Overview

The Chapel Attendance System now features a sophisticated auth simulation that behaves exactly like real authentication while using configurable test users. This system teaches you about permission requirements through realistic 403 errors and seamless user switching.

## Key Features

### 🔄 **User Switching via JSON Config**
- Edit `src/lib/auth/auth-config.json` to switch between users instantly
- No code changes needed - just update the config file
- System detects changes and updates cached user automatically

### 🎯 **Real Permission Validation**
- Uses actual user roles from database records
- **FAILS with proper 403 errors** when permissions insufficient
- Teaches you what role each endpoint actually requires
- No "always succeed" behavior - acts like real auth

### 💾 **Realistic Caching & Sessions**
- Implements JWT-like token lifecycle with expiration
- Configurable cache expiry and refresh thresholds
- Session management patterns identical to production auth
- Auto-refresh tokens when near expiry

### 🔍 **Permission Discovery**
- Try operations with admin user → Get 403 for superadmin endpoints
- Switch to superadmin user → Same operations now work
- Learn exactly which endpoints need which permissions

## Quick Start

### 1. Current User Configuration

The system starts with Anuoluwa (admin role):

```json
{
  "currentUser": {
    "id": "2c28ad31-7346-4587-a992-2df1d78a1275",
    "email": "SECRETARY@mtu.chapel",
    "cacheExpiry": null
  }
}
```

### 2. Switch Users for Testing

**Method 1: Edit JSON directly**
```json
{
  "currentUser": {
    "id": "superadmin-test-id-456",
    "email": "superadmin@mtu.chapel", 
    "cacheExpiry": null
  }
}
```

**Method 2: Use UserSwitcher utility**
```typescript
import { userSwitcher } from '@/lib/auth/user-switcher';

// Switch to superadmin for testing
await userSwitcher.switchToRole('superadmin');

// Switch to specific user
await userSwitcher.switchToUser('2c28ad31-7346-4587-a992-2df1d78a1275');

// List available users
const users = await userSwitcher.listAvailableUsers();
console.log(users);
```

### 3. Permission Discovery Workflow

1. **Start with admin user** (default in config)
2. **Try superadmin operations** → Get 403 errors
3. **Switch to superadmin user** in config
4. **Try same operations** → Now they work
5. **Learn which endpoints need which permissions**

## Permission System

### Role Hierarchy
- **superadmin**: Can do everything (level 2)
- **admin**: Can do most things (level 1)  
- **none**: No permissions (level 0)

### Operation Permissions
```typescript
// Examples from src/lib/auth/permissions.ts
'list_admins': 'admin'        // Admin can list
'create_admin': 'superadmin'  // Only superadmin can create
'delete_admin': 'superadmin'  // Only superadmin can delete
'promote_admin': 'superadmin' // Only superadmin can promote
```

## Testing Different Scenarios

### Test Admin Limitations
1. Set config to admin user:
```json
"currentUser": { "id": "2c28ad31-7346-4587-a992-2df1d78a1275" }
```

2. Try these operations:
- ✅ GET `/api/admins` (list admins)
- ✅ GET `/api/admins/[id]` (view admin)
- ❌ POST `/api/admins` (create admin) → 403
- ❌ DELETE `/api/admins/[id]` (delete admin) → 403
- ❌ POST `/api/admins/[id]/promote` (promote) → 403

### Test Superadmin Access
1. Set config to superadmin user:
```json
"currentUser": { "id": "superadmin-test-id-456" }
```

2. Try same operations:
- ✅ All operations now work

### Test Token Expiration
```typescript
// Set short expiry for testing
await userSwitcher.setCacheExpiry(5000); // 5 seconds

// Wait and try operation → Should get 401/403
// Token auto-refreshes if within threshold
```

## Available Users

### Admin User (Default)
```json
{
  "id": "2c28ad31-7346-4587-a992-2df1d78a1275",
  "email": "SECRETARY@mtu.chapel",
  "role": "admin",
  "description": "Anuoluwa Adeshina - Admin user for testing admin-level permissions"
}
```

### Superadmin User
```json
{
  "id": "superadmin-test-id-456", 
  "email": "superadmin@mtu.chapel",
  "role": "superadmin",
  "description": "Test superadmin user for testing superadmin-level permissions"
}
```

## Session Configuration

```json
{
  "sessionConfig": {
    "tokenLifetime": 3600000,     // 1 hour token life
    "refreshThreshold": 300000,   // Auto-refresh if <5min left
    "simulateExpiration": true    // Enable/disable expiration
  }
}
```

## Development Workflow

### 1. Permission Discovery
```bash
# Start with admin user (default)
npm run dev

# Try admin operations → Should work
# Try superadmin operations → Should get 403

# Edit auth-config.json to switch to superadmin
# Try same operations → Now work
```

### 2. Building Features
```bash
# Use appropriate user role for the feature you're building
# System will teach you what permissions are needed
# No authentication hassles while maintaining realistic behavior
```

### 3. Testing Edge Cases
```typescript
// Test token expiration
await userSwitcher.setCacheExpiry(1000);

// Test role switching
await userSwitcher.switchToRole('admin');
await userSwitcher.switchToRole('superadmin');

// Test permission validation
import { validateOperationPermission } from '@/lib/auth/permissions';
validateOperationPermission('admin', 'create_admin'); // Throws 403
```

## Production Readiness

### Seamless Supabase Switch
When ready for production:

1. **Environment variable switch**:
```bash
NEXT_PUBLIC_USE_FAKE_AUTH=false
```

2. **Implement Supabase methods** in `src/lib/auth/supabase-auth.ts`
3. **Zero code changes** needed in routes/components
4. **Identical behavior patterns** and error handling

### Migration Checklist
- [ ] Implement Supabase auth methods
- [ ] Update environment variables
- [ ] Test permission validation still works
- [ ] Verify token handling matches patterns
- [ ] Confirm error responses are identical

## Troubleshooting

### Common Issues

**403 Errors (Expected Behavior)**
```
Access denied: create_admin requires superadmin role, but user has admin role
```
- This is correct! Switch to superadmin user to proceed

**Token Expired**
```
Token expired
```
- Normal behavior if `simulateExpiration: true`
- Token auto-refreshes within threshold
- Manually refresh or disable expiration for testing

**User Not Found**
```
User 2c28ad31-7346-4587-a992-2df1d78a1275 not found in auth config
```
- Check `availableUsers` array in config
- Ensure user ID matches exactly

### Debug Commands

```typescript
// Check current user
const user = await getCurrentUser();
console.log('Current user:', user);

// Check token validity
const valid = await isTokenValid();
console.log('Token valid:', valid);

// List available users
const users = await userSwitcher.listAvailableUsers();
console.log('Available users:', users);
```

## Benefits

### For Development
- **Learn permission requirements** through realistic failures
- **Easy user switching** without authentication hassles  
- **Realistic auth patterns** prepare you for production
- **No hardcoded permissions** - uses real validation logic

### For Production
- **Zero refactor needed** when switching to real auth
- **Identical error handling** and response patterns
- **Same caching and session management** 
- **Proven permission validation** already tested

This sophisticated auth system provides the perfect balance of development convenience and production realism, teaching you about your system's permission requirements while maintaining a seamless development experience.
