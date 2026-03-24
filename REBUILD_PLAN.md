# HVAC App Rebuild Plan

## Architecture
- **Backend**: Express.js (server.js) - API only
- **Frontend**: Vanilla HTML/CSS/JS (3 pages: index, job_form, job_view)
- **Database**: Supabase PostgreSQL
- **Sessions**: Browser UUID stored in localStorage

## Database Schema

### jobs table
- id (uuid, pk)
- session_id (uuid, indexed)
- job_date (date)
- job_type (enum: maintenance_first_time, maintenance_renewal, maintenance_check, filter_change, service_call)
- customer_name (text)
- address_line1 (text)
- address_line2 (text)
- phone (text)
- status (enum: pending, in_progress, complete)
- system_count (jsonb) - { electric_heat_pump: N, gas_ac: N, electric_ac: N, dual_fuel: N }
- system_data (jsonb) - nested by system_type_unit_section
- notes (text)
- created_at, updated_at (timestamps)

### tax_rates table
- county (text, pk)
- rate (decimal)
- updated_at (timestamp)

## API Routes
- GET /api/jobs - list jobs for session
- POST /api/jobs - create job
- GET /api/jobs/:id - get job detail
- PUT /api/jobs/:id - update job
- DELETE /api/jobs/:id - delete job
- GET /api/tax-rates/:county - lookup tax rate

## Frontend Pages
1. **index.html** - Job list dashboard (collapsible cards with colors)
2. **job_form.html** - Create/edit job (dynamic form based on system selections)
3. **job_view.html** - Read-only job detail (formatted display)

## Implementation Order
1. Database schema + migrations
2. Backend API (CRUD operations)
3. Frontend HTML structure (all 3 pages)
4. CSS (light theme, responsive, high contrast)
5. JavaScript (session, form logic, conditional fields, fetch calls)
6. Testing and refinement

## Key Features
✓ Multi-system support (Electric Heat Pump, Gas/AC, Electric/AC, Dual Fuel)
✓ Conditional field visibility (clean, blower motor, capacitor, etc.)
✓ Dynamic form generation based on system type
✓ Session-based isolation (no login)
✓ Collapsible job cards with colors
✓ Light theme for daylight readability
