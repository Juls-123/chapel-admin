# Services API TODO

## Endpoints to implement in Phase 2:

### GET /api/services
- **Request**: Query params: `type?`, `status?`, `date_from?`, `date_to?`, `page?`, `limit?`
- **Response**: `Service[]`
- **Validation**: Use `serviceSchema.array()` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query `services` table with optional filters

### GET /api/services/:id
- **Request**: Path param: `id` (UUID)
- **Response**: `Service`
- **Validation**: Use `serviceSchema` for response validation
- **Auth**: Require admin/staff role
- **Database**: Query single service with related data

## Implementation Notes:
- Filter by service type: 'morning', 'evening', 'special'
- Filter by status: 'scheduled', 'active', 'completed', 'canceled'
- Support date range filtering for service_date
- Include service_levels relationship data when needed
