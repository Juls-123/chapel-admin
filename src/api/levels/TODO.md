# Levels API TODO

## Endpoints to implement in Phase 2:

### GET /api/levels
- **Request**: No query params needed (small dataset)
- **Response**: `Level[]`
- **Validation**: Use `levelSchema.array()` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query `levels` table (100L, 200L, 300L, 400L)

## Implementation Notes:
- Static data that rarely changes
- Can be cached aggressively (long TTL)
- Order by code ASC (100, 200, 300, 400)
- No pagination needed due to small dataset size
