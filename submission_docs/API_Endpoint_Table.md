# WMT API Endpoint Table

Base URL: `http://<host>:<port>/api`

## Implemented Endpoints (Current Server)
| Module | Method | Endpoint | Access | Description |
|---|---|---|---|---|
| Health | GET | `/health` | Public | API heartbeat check |
| Auth | POST | `/auth/register` | Public | Register new user |
| Auth | POST | `/auth/login` | Public | Authenticate user |
| Auth | GET | `/auth/me` | Protected | Get current logged-in user |
| Rooms | GET | `/rooms` | Public | List rooms |
| Rooms | GET | `/rooms/:id` | Public | Get room by ID |
| Rooms | POST | `/rooms` | Admin | Create room |
| Rooms | PUT | `/rooms/:id` | Admin | Update room |
| Rooms | DELETE | `/rooms/:id` | Admin | Delete room |
| Bookings | POST | `/bookings` | Protected | Create booking |
| Bookings | GET | `/bookings/my` | Protected | Logged user bookings |
| Bookings | GET | `/bookings` | Admin | List all bookings |
| Bookings | PUT | `/bookings/:id/status` | Admin | Update booking status |
| Bookings | DELETE | `/bookings/:id` | Protected | Cancel booking |
| Admin Users | GET | `/admin/users` | Admin | List users |
| Admin Users | PUT | `/admin/users/:id` | Admin | Update user profile/role |
| Upload | POST | `/upload` | Admin | Upload room image |

## Planned Endpoints (For New Collections)
| Module | Method | Endpoint | Access | Description |
|---|---|---|---|---|
| Pricing | GET | `/pricing` | Public/Admin | List pricing plans |
| Pricing | POST | `/pricing` | Admin | Create pricing rule |
| Pricing | PUT | `/pricing/:id` | Admin | Update pricing |
| Room Amenities | GET | `/amenities` | Public/Admin | List amenities |
| Room Amenities | POST | `/amenities` | Admin | Create amenity |
| Contact Messages | POST | `/contact-messages` | Public | Submit contact message |
| Contact Messages | GET | `/contact-messages` | Admin | View inbox |
| Housekeeping | GET | `/housekeeping-tasks` | Admin/Staff | List tasks |
| Housekeeping | POST | `/housekeeping-tasks` | Admin | Create housekeeping task |
| Inventory | GET | `/inventory-items` | Admin | List inventory |
| Inventory | POST | `/inventory-items` | Admin | Add inventory item |
| Maintenance | GET | `/maintenance-requests` | Admin/Staff | List requests |
| Maintenance | POST | `/maintenance-requests` | Admin/Staff | Create request |
| Coupons | GET | `/coupons` | Public/Admin | List valid coupons |
| Coupons | POST | `/coupons` | Admin | Create coupon |
