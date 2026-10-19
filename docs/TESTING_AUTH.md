# Testing Auth Middleware

## Manual Testing

### 1. Test Public Route (Health Check)
```bash
curl http://localhost:3000/api/health
```
Expected: `{"status":"ok"}`

### 2. Test Protected Route Without Auth
```bash
curl http://localhost:3000/api/user/profile
```
Expected: `{"error":"Unauthorized"}` with status 401

### 3. Test Login Flow
```bash
# Get nonce
curl -X POST http://localhost:3000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"GXXXXXXX"}'

# Login (signature verification not implemented yet)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"GXXXXXXX","signature":"dummy"}' \
  -c cookies.txt

# Access protected route with session
curl http://localhost:3000/api/user/profile \
  -b cookies.txt
```
Expected: `{"publicKey":"GXXXXXXX"}`

### 4. Test Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt

# Try accessing protected route after logout
curl http://localhost:3000/api/user/profile \
  -b cookies.txt
```
Expected: `{"error":"Unauthorized"}` with status 401

## Browser Testing

1. Open browser DevTools → Application → Cookies
2. Navigate to login page (when implemented)
3. After login, verify `session` cookie exists
4. Make requests to protected routes
5. Logout and verify cookie is cleared
