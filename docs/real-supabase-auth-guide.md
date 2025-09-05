# Real Supabase Auth Implementation Guide

## Overview

The Chapel Attendance System now uses **real Supabase authentication** with development auto-login for seamless development experience. This implementation provides production-ready JWT validation while maintaining development convenience.

## 🚀 **Key Features**

### **Real Supabase Auth**
- Actual JWT tokens with proper validation
- Real session management and auto-refresh
- Production-ready authentication patterns
- Server-side JWT verification in API routes

### **Development Auto-Login**
- Automatically signs in during development
- No login page needed while building
- Easy user switching via browser console
- Real permission discovery through 403 errors

### **Two-Role System**
- `admin` - Basic administrative permissions
- `superadmin` - Full administrative permissions
- Role hierarchy: superadmin can access admin endpoints

## 🛠️ **Setup Instructions**

### 1. Environment Configuration
Copy `env.example` to `.env.local`:
```bash
cp env.example .env.local
```

Update with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Auth Setup
Create development users in your Supabase Auth dashboard:

**Admin User:**
- Email: `SECRETARY@mtu.chapel`
- Password: `dev-admin-123`

**Superadmin User:**
- Email: `superadmin@mtu.chapel`
- Password: `dev-superadmin-123`

### 3. Database Linking
Link Supabase Auth users to your admin records:

```sql
-- Link existing admin to Supabase Auth user
UPDATE admins 
SET auth_user_id = 'supabase-auth-user-id-from-auth-dashboard'
WHERE email = 'SECRETARY@mtu.chapel';

-- Create superadmin user if needed
INSERT INTO admins (
  first_name, last_name, email, role, auth_user_id
) VALUES (
  'Super', 'Admin', 'superadmin@mtu.chapel', 'superadmin', 'supabase-auth-user-id-for-superadmin'
);
```

## 🔧 **Development Workflow**

### Auto-Login Experience
1. **Start dev server**: `npm run dev`
2. **Auto-login occurs**: Console shows "🚀 Dev auto-login successful"
3. **Real JWT tokens**: Proper Authorization headers in requests
4. **Permission discovery**: Real 403 errors teach you endpoint requirements

### User Switching
Access the global user switcher in browser console:

```javascript
// Switch to admin user
await devUserSwitcher.switchToAdmin();

// Switch to superadmin user  
await devUserSwitcher.switchToSuperAdmin();

// Check current user
await devUserSwitcher.getCurrentUser();

// View session info
await devUserSwitcher.getSession();
```

### Permission Testing Workflow
1. **Start with admin user** (default auto-login)
2. **Try admin endpoints** → Should work ✅
3. **Try superadmin endpoints** → Get real 403 errors ❌
4. **Switch to superadmin**: `devUserSwitcher.switchToSuperAdmin()`
5. **Try same endpoints** → Now they work ✅
6. **Learn permission requirements** through realistic failures

## 🔐 **Authentication Flow**

### Client-Side (Browser)
```typescript
// Auto-login in development
const { data } = await supabase.auth.signInWithPassword({
  email: 'SECRETARY@mtu.chapel',
  password: 'dev-admin-123'
});

// JWT token automatically included in requests
const headers = await getAuthHeaders();
// Returns: { Authorization: 'Bearer jwt-token-here' }
```

### Server-Side (API Routes)
```typescript
// JWT validation in route factory
const authHeader = request.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

// Verify with Supabase
const { data: { user }, error } = await supabase.auth.getUser(token);

// Get role from admin table
const { data: adminData } = await supabase
  .from('admins')
  .select('role')
  .eq('auth_user_id', user.id)
  .single();
```

## 📊 **Permission System**

### Role Hierarchy
- **superadmin** (level 2): Can access all endpoints
- **admin** (level 1): Can access admin-level endpoints
- **none** (level 0): No access

### Example Endpoint Permissions
```typescript
// Admin endpoints (both admin and superadmin can access)
GET /api/admins          // ✅ admin, ✅ superadmin
GET /api/admins/[id]     // ✅ admin, ✅ superadmin

// Superadmin-only endpoints
POST /api/admins         // ❌ admin, ✅ superadmin
DELETE /api/admins/[id]  // ❌ admin, ✅ superadmin
POST /api/admins/[id]/promote // ❌ admin, ✅ superadmin
```

### Real 403 Error Messages
```json
{
  "error": true,
  "message": "Access denied: superadmin role required, but user has admin role",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

## 🧪 **Testing & Verification**

### Development Testing
```bash
# 1. Start development server
npm run dev

# 2. Check browser console for auto-login
# Should see: "🚀 Dev auto-login successful as admin: SECRETARY@mtu.chapel"

# 3. Test admin endpoints
curl -H "Authorization: Bearer $(get-jwt-from-browser)" \
  http://localhost:3000/api/admins

# 4. Test superadmin endpoints (should get 403)
curl -H "Authorization: Bearer $(get-jwt-from-browser)" \
  -X POST http://localhost:3000/api/admins \
  -d '{"first_name":"Test","last_name":"User","email":"test@example.com","role":"admin"}'

# 5. Switch to superadmin and retry
```

### JWT Token Verification
```javascript
// In browser console
const session = await supabase.auth.getSession();
console.log('JWT Token:', session.data.session?.access_token);

// Decode JWT payload (for debugging)
const payload = JSON.parse(atob(session.data.session.access_token.split('.')[1]));
console.log('Token payload:', payload);
```

## 🚀 **Production Readiness**

### Production Switch
When ready for production:

1. **Remove auto-login**: Comment out auto-login in `AuthProvider`
2. **Add login form**: Create login UI using Supabase auth
3. **Same auth patterns**: All JWT validation remains identical
4. **Zero code changes**: API routes work exactly the same

### Production Auth Flow
```typescript
// Production login (replace auto-login)
const { data, error } = await supabase.auth.signInWithPassword({
  email: userEmail,
  password: userPassword
});

// Same JWT validation on server
// Same permission checking
// Same error handling
```

## 🔍 **Troubleshooting**

### Common Issues

**Auto-login fails**
```
🚫 Dev auto-login failed: Invalid login credentials
```
- Check Supabase Auth dashboard for user accounts
- Verify email/password match exactly
- Ensure users exist in Auth, not just admin table

**JWT validation fails**
```
Invalid JWT token: JWT expired
```
- Tokens auto-refresh, but check session validity
- Verify Supabase URL and anon key in environment
- Check network requests for proper Authorization headers

**Permission errors (expected)**
```
Access denied: superadmin role required, but user has admin role
```
- This is correct behavior! Switch to superadmin user
- Use `devUserSwitcher.switchToSuperAdmin()`

**User not found in admins table**
```
User not found in admins table: user@example.com
```
- Link auth_user_id in admins table to Supabase Auth user ID
- Check that auth_user_id column exists and is populated

### Debug Commands

```javascript
// Check current auth state
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session expires:', new Date(session.expires_at * 1000));

// Test API with current token
const headers = await getAuthHeaders();
fetch('/api/admins', { headers }).then(r => r.json()).then(console.log);
```

## 📈 **Benefits**

### Development Experience
- **No authentication hassles** - auto-login handles it
- **Real permission discovery** - learn through realistic 403 errors
- **Easy user switching** - test different roles instantly
- **Production patterns** - same auth flow as production

### Production Benefits
- **Real JWT security** - proper token validation
- **Scalable auth** - Supabase handles user management
- **Zero refactor needed** - development patterns work in production
- **Battle-tested** - using proven Supabase auth infrastructure

This implementation provides the perfect balance of development convenience and production readiness, using real authentication patterns while maintaining a seamless development experience.
