import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Salonomia API',
    version: '1.0.0',
    description:
      'Multi-tenant salon booking platform. Auth uses httpOnly cookies (login first via /api/auth/login, then all subsequent requests are authenticated automatically via cookie).',
  },
  servers: [{ url: '', description: 'Same origin' }],
  tags: [
    { name: 'Auth', description: 'Authentication & session' },
    { name: 'Public', description: 'No auth required — public salon discovery' },
    { name: 'Customer', description: 'Customer profile & reservations (any authenticated user)' },
    { name: 'Reservations', description: 'Customer-side booking' },
    { name: 'Salons', description: 'Salon CRUD (superadmin only for write)' },
    { name: 'Salon · Employees', description: 'Employee management (salon admin/manager)' },
    { name: 'Salon · Portfolio', description: 'Employee portfolio photos' },
    { name: 'Salon · Schedule', description: 'Working schedules, breaks, time-off' },
    { name: 'Salon · Services', description: 'Service & category management' },
    { name: 'Salon · Reservations', description: 'Salon-side reservation management' },
    { name: 'Salon · Settings', description: 'Salon profile & booking policy' },
    { name: 'Salon · Reports', description: 'Salon-scoped reports' },
    { name: 'Superadmin · Overview', description: 'Platform-wide stats & users' },
    { name: 'Superadmin · Salons', description: 'Superadmin salon management' },
    { name: 'Superadmin · Stylists', description: 'Superadmin stylist management' },
    { name: 'Superadmin · Services', description: 'Superadmin service management' },
    { name: 'Superadmin · Reports', description: 'Platform-wide analytics' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'JWT set automatically after /api/auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }],
  paths: {
    // ── AUTH ────────────────────────────────────────────────────────────────
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'superadmin@salonomia.az' },
                  password: { type: 'string', example: 'Test1234!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, JWT set in httpOnly cookie' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (clears cookie)',
        responses: {
          204: { description: 'Logged out' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        responses: {
          200: {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    fullName: { type: 'string' },
                    isSuperadmin: { type: 'boolean' },
                  },
                },
              },
            },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created, JWT set in cookie' },
          409: { description: 'Email already in use' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: { 204: { description: 'Email sent (if address exists)' } },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8 } } } } },
        },
        responses: { 204: { description: 'Password reset' }, 400: { description: 'Invalid or expired token' } },
      },
    },
    '/api/auth/my-salons': {
      get: {
        tags: ['Auth'],
        summary: 'List salons the current user is a member of',
        responses: {
          200: { description: 'Array of salons with role' },
          401: { description: 'Not authenticated' },
        },
      },
    },

    // ── PUBLIC ──────────────────────────────────────────────────────────────
    '/api/public/salons': {
      get: {
        tags: ['Public'],
        summary: 'List public salons (discovery)',
        security: [],
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'city', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated salon list' } },
      },
    },
    '/api/public/salons/{slug}': {
      get: {
        tags: ['Public'],
        summary: 'Get public salon detail by slug',
        security: [],
        parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Salon detail with services, employees, categories' }, 404: { description: 'Not found' } },
      },
    },
    '/api/public/salons/{slug}/availability': {
      get: {
        tags: ['Public'],
        summary: 'Get available time slots for a given date',
        security: [],
        parameters: [
          { in: 'path', name: 'slug', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'date', required: true, schema: { type: 'string', format: 'date', example: '2026-08-10' } },
          { in: 'query', name: 'serviceId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'employeeId', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Available time slots' } },
      },
    },
    '/api/public/salons/{slug}/availability-bulk': {
      get: {
        tags: ['Public'],
        summary: 'Get availability for a date range (calendar view)',
        security: [],
        parameters: [
          { in: 'path', name: 'slug', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'from', required: true, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', required: true, schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'serviceId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Availability map by date' } },
      },
    },

    // ── CUSTOMER ────────────────────────────────────────────────────────────
    '/api/customer/profile': {
      get: {
        tags: ['Customer'],
        summary: 'Get current user profile',
        responses: { 200: { description: 'User profile' }, 401: { description: 'Not authenticated' } },
      },
      patch: {
        tags: ['Customer'],
        summary: 'Update current user profile',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { fullName: { type: 'string' }, phone: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Updated profile' } },
      },
    },
    '/api/customer/reservations': {
      get: {
        tags: ['Customer'],
        summary: 'List current user reservations',
        parameters: [
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Paginated reservations' } },
      },
    },
    '/api/customer/reservations/{id}': {
      get: {
        tags: ['Customer'],
        summary: 'Get a specific reservation (customer)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Reservation detail' }, 404: { description: 'Not found' } },
      },
    },

    // ── RESERVATIONS (customer booking) ─────────────────────────────────────
    '/api/reservations': {
      post: {
        tags: ['Reservations'],
        summary: 'Create a new booking (customer)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['salonId', 'serviceId', 'startAt'],
                properties: {
                  salonId: { type: 'string' },
                  serviceId: { type: 'string' },
                  employeeId: { type: 'string', nullable: true },
                  startAt: { type: 'string', format: 'date-time', example: '2026-08-10T10:00:00.000Z' },
                  guestName: { type: 'string', description: 'For unauthenticated bookings' },
                  guestPhone: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Reservation created' }, 409: { description: 'Slot not available' } },
      },
    },
    '/api/reservations/{id}/cancel': {
      post: {
        tags: ['Reservations'],
        summary: 'Cancel a reservation (customer)',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Cancelled' }, 404: { description: 'Not found or not yours' } },
      },
    },

    // ── SALONS ──────────────────────────────────────────────────────────────
    '/api/salons': {
      get: {
        tags: ['Salons'],
        summary: 'List salons (superadmin sees all; members see their own)',
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'pageSize', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated salon list' } },
      },
      post: {
        tags: ['Salons'],
        summary: 'Create a new salon (superadmin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'timezone', 'adminEmail'],
                properties: {
                  name: { type: 'string' },
                  timezone: { type: 'string', example: 'Asia/Baku' },
                  city: { type: 'string' },
                  adminEmail: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Salon created' } },
      },
    },
    '/api/salons/{salonId}': {
      get: {
        tags: ['Salons'],
        summary: 'Get salon detail',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Salon detail' }, 404: { description: 'Not found' } },
      },
      patch: {
        tags: ['Salons'],
        summary: 'Update salon (superadmin only)',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, city: { type: 'string' }, timezone: { type: 'string' }, description: { type: 'string' }, addressLine: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Updated salon' } },
      },
    },
    '/api/salons/{salonId}/suspend': {
      post: {
        tags: ['Salons'],
        summary: 'Suspend salon (superadmin only)',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Suspended' } },
      },
    },
    '/api/salons/{salonId}/restore': {
      post: {
        tags: ['Salons'],
        summary: 'Restore suspended salon (superadmin only)',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Restored' } },
      },
    },

    // ── SALON SETTINGS ──────────────────────────────────────────────────────
    '/api/salons/{salonId}/settings': {
      get: {
        tags: ['Salon · Settings'],
        summary: 'Get salon settings & booking policy',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Salon settings' } },
      },
      patch: {
        tags: ['Salon · Settings'],
        summary: 'Update salon settings & booking policy',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  description: { type: 'string', nullable: true },
                  addressLine: { type: 'string', nullable: true },
                  phone: { type: 'string', nullable: true },
                  email: { type: 'string', nullable: true },
                  genderFocus: { type: 'string', enum: ['WOMEN', 'MEN', 'UNISEX'], nullable: true },
                  autoConfirm: { type: 'boolean' },
                  minNoticeMinutes: { type: 'integer' },
                  maxAdvanceDays: { type: 'integer' },
                  cancellationWindowHours: { type: 'integer' },
                  rescheduleWindowHours: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated settings' } },
      },
    },

    // ── EMPLOYEES ────────────────────────────────────────────────────────────
    '/api/salons/{salonId}/employees': {
      get: {
        tags: ['Salon · Employees'],
        summary: 'List salon employees',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'isActive', schema: { type: 'string', enum: ['true', 'false'] } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Employee list' } },
      },
      post: {
        tags: ['Salon · Employees'],
        summary: 'Create employee',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['fullName'], properties: { fullName: { type: 'string' }, bio: { type: 'string', nullable: true } } } } },
        },
        responses: { 201: { description: 'Employee created' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}': {
      get: {
        tags: ['Salon · Employees'],
        summary: 'Get employee detail',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Employee detail with services & portfolio' } },
      },
      patch: {
        tags: ['Salon · Employees'],
        summary: 'Update employee',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { fullName: { type: 'string' }, bio: { type: 'string', nullable: true }, serviceIds: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 200: { description: 'Updated employee' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}/activate': {
      post: {
        tags: ['Salon · Employees'],
        summary: 'Activate employee',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Activated' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}/deactivate': {
      post: {
        tags: ['Salon · Employees'],
        summary: 'Deactivate employee',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Deactivated' } },
      },
    },

    // ── PORTFOLIO ────────────────────────────────────────────────────────────
    '/api/salons/{salonId}/employees/{employeeId}/portfolio': {
      get: {
        tags: ['Salon · Portfolio'],
        summary: 'List portfolio items',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Portfolio items array' } },
      },
      post: {
        tags: ['Salon · Portfolio'],
        summary: 'Add portfolio item (confirm upload)',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['objectKey'], properties: { objectKey: { type: 'string' } } } } } },
        responses: { 201: { description: 'Portfolio item created' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}/portfolio/upload-url': {
      post: {
        tags: ['Salon · Portfolio'],
        summary: 'Request presigned upload URL for portfolio photo',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['mimeType', 'sizeBytes'], properties: { mimeType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] }, sizeBytes: { type: 'integer' } } } } },
        },
        responses: { 200: { description: 'Presigned PUT URL + objectKey' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}/portfolio/{itemId}': {
      patch: {
        tags: ['Salon · Portfolio'],
        summary: 'Update portfolio item caption',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'itemId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { caption: { type: 'string', nullable: true } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Salon · Portfolio'],
        summary: 'Delete portfolio item',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'itemId', required: true, schema: { type: 'string' } },
        ],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}/portfolio/reorder': {
      post: {
        tags: ['Salon · Portfolio'],
        summary: 'Reorder portfolio items',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['itemIds'], properties: { itemIds: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 200: { description: 'Reordered' } },
      },
    },

    // ── SCHEDULE ─────────────────────────────────────────────────────────────
    '/api/salons/{salonId}/employees/{employeeId}/working-schedule': {
      get: {
        tags: ['Salon · Schedule'],
        summary: 'Get working schedule',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Working schedule entries' } },
      },
      post: {
        tags: ['Salon · Schedule'],
        summary: 'Set working schedule (replaces all entries)',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  entries: {
                    type: 'array',
                    items: { type: 'object', properties: { weekday: { type: 'integer', minimum: 0, maximum: 6 }, startMinuteOfDay: { type: 'integer' }, endMinuteOfDay: { type: 'integer' } } },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated schedule' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}/breaks': {
      get: {
        tags: ['Salon · Schedule'],
        summary: 'List breaks',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Break entries' } },
      },
      post: {
        tags: ['Salon · Schedule'],
        summary: 'Create break',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { weekday: { type: 'integer' }, startMinuteOfDay: { type: 'integer' }, endMinuteOfDay: { type: 'integer' }, label: { type: 'string' } } } } } },
        responses: { 201: { description: 'Break created' } },
      },
    },
    '/api/salons/{salonId}/employees/{employeeId}/time-off': {
      get: {
        tags: ['Salon · Schedule'],
        summary: 'List time-off entries',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Time-off entries' } },
      },
      post: {
        tags: ['Salon · Schedule'],
        summary: 'Create time-off entry',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { startAt: { type: 'string', format: 'date-time' }, endAt: { type: 'string', format: 'date-time' }, reason: { type: 'string' } } } } } },
        responses: { 201: { description: 'Time-off created' } },
      },
    },

    // ── SERVICES ─────────────────────────────────────────────────────────────
    '/api/salons/{salonId}/service-categories': {
      get: {
        tags: ['Salon · Services'],
        summary: 'List service categories',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Categories list' } },
      },
      post: {
        tags: ['Salon · Services'],
        summary: 'Create service category',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
        responses: { 201: { description: 'Category created' } },
      },
    },
    '/api/salons/{salonId}/service-categories/{categoryId}': {
      patch: {
        tags: ['Salon · Services'],
        summary: 'Update service category',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'categoryId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Salon · Services'],
        summary: 'Delete service category',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'categoryId', required: true, schema: { type: 'string' } },
        ],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/api/salons/{salonId}/services': {
      get: {
        tags: ['Salon · Services'],
        summary: 'List services',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'isActive', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: { 200: { description: 'Services list' } },
      },
      post: {
        tags: ['Salon · Services'],
        summary: 'Create service',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'priceAmount', 'currency', 'durationMinutes'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  categoryId: { type: 'string', nullable: true },
                  priceAmount: { type: 'integer', description: 'Price in cents/minor currency unit' },
                  currency: { type: 'string', example: 'AZN' },
                  durationMinutes: { type: 'integer' },
                  bufferMinutes: { type: 'integer', default: 0 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Service created' } },
      },
    },
    '/api/salons/{salonId}/services/{serviceId}': {
      get: {
        tags: ['Salon · Services'],
        summary: 'Get service detail',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Service detail' } },
      },
      patch: {
        tags: ['Salon · Services'],
        summary: 'Update service',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, priceAmount: { type: 'integer' }, durationMinutes: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/salons/{salonId}/services/{serviceId}/activate': {
      post: {
        tags: ['Salon · Services'],
        summary: 'Activate service',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Activated' } },
      },
    },
    '/api/salons/{salonId}/services/{serviceId}/deactivate': {
      post: {
        tags: ['Salon · Services'],
        summary: 'Deactivate service',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Deactivated' } },
      },
    },

    // ── SALON RESERVATIONS ───────────────────────────────────────────────────
    '/api/salons/{salonId}/reservations': {
      get: {
        tags: ['Salon · Reservations'],
        summary: 'List salon reservations',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'employeeId', schema: { type: 'string' } },
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Paginated reservations' } },
      },
    },
    '/api/salons/{salonId}/reservations/manual': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Create manual reservation (salon-side)',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['serviceId', 'startAt'],
                properties: {
                  serviceId: { type: 'string' },
                  employeeId: { type: 'string' },
                  startAt: { type: 'string', format: 'date-time' },
                  customerId: { type: 'string', nullable: true },
                  guestName: { type: 'string' },
                  guestPhone: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Reservation created' } },
      },
    },
    '/api/salons/{salonId}/reservations/booking-options': {
      get: {
        tags: ['Salon · Reservations'],
        summary: 'Get booking options (services + employees for manual booking form)',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Services and employees' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}': {
      get: {
        tags: ['Salon · Reservations'],
        summary: 'Get reservation detail',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Reservation detail' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}/confirm': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Confirm reservation',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Confirmed' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}/cancel': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Cancel reservation (salon-side)',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Cancelled' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}/reject': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Reject reservation',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Rejected' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}/check-in': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Mark customer as checked in',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Checked in' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}/complete': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Mark reservation as completed',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Completed' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}/no-show': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Mark as no-show',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'No-show recorded' } },
      },
    },
    '/api/salons/{salonId}/reservations/{reservationId}/reschedule': {
      post: {
        tags: ['Salon · Reservations'],
        summary: 'Reschedule reservation',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'reservationId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['startAt'], properties: { startAt: { type: 'string', format: 'date-time' } } } } } },
        responses: { 200: { description: 'Rescheduled' } },
      },
    },

    // ── SALON REPORTS ────────────────────────────────────────────────────────
    '/api/salons/{salonId}/reports': {
      get: {
        tags: ['Salon · Reports'],
        summary: 'Salon performance report',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Report data' } },
      },
    },
    '/api/salons/{salonId}/reports/audit-logs': {
      get: {
        tags: ['Salon · Reports'],
        summary: 'Audit log for salon (admin only)',
        parameters: [
          { in: 'path', name: 'salonId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Audit log entries' } },
      },
    },

    // ── SUPERADMIN ───────────────────────────────────────────────────────────
    '/api/superadmin/stats': {
      get: {
        tags: ['Superadmin · Overview'],
        summary: 'Platform dashboard stats',
        responses: { 200: { description: 'Counts and recent items' } },
      },
    },
    '/api/superadmin/users': {
      get: {
        tags: ['Superadmin · Overview'],
        summary: 'List all users',
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'role', schema: { type: 'string', enum: ['SUPERADMIN', 'STYLIST', 'CUSTOMER'] } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Paginated users' } },
      },
    },
    '/api/superadmin/users/{userId}': {
      get: {
        tags: ['Superadmin · Overview'],
        summary: 'Get user detail',
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User detail' } },
      },
      patch: {
        tags: ['Superadmin · Overview'],
        summary: 'Update user (suspend/activate)',
        parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'] } } } } } },
        responses: { 200: { description: 'Updated user' } },
      },
    },
    '/api/superadmin/reservations': {
      get: {
        tags: ['Superadmin · Overview'],
        summary: 'List all platform reservations',
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'salonId', schema: { type: 'string' } },
          { in: 'query', name: 'employeeId', schema: { type: 'string' } },
          { in: 'query', name: 'serviceId', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string' } },
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Paginated reservations' } },
      },
    },
    '/api/superadmin/stylists': {
      get: {
        tags: ['Superadmin · Stylists'],
        summary: 'List all stylists across salons',
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'salonId', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Paginated stylists' } },
      },
    },
    '/api/superadmin/stylists/{employeeId}': {
      get: {
        tags: ['Superadmin · Stylists'],
        summary: 'Get stylist detail',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Stylist detail with portfolio, schedule, services' } },
      },
      patch: {
        tags: ['Superadmin · Stylists'],
        summary: 'Update stylist',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { isActive: { type: 'boolean' }, fullName: { type: 'string' }, bio: { type: 'string', nullable: true } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/superadmin/stylists/{employeeId}/photo': {
      post: {
        tags: ['Superadmin · Stylists'],
        summary: 'Request presigned URL for stylist profile photo',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['mimeType', 'sizeBytes'], properties: { mimeType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] }, sizeBytes: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Presigned PUT URL + objectKey' } },
      },
      patch: {
        tags: ['Superadmin · Stylists'],
        summary: 'Confirm stylist photo upload',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['objectKey'], properties: { objectKey: { type: 'string' } } } } } },
        responses: { 200: { description: 'photoUrl saved' } },
      },
      delete: {
        tags: ['Superadmin · Stylists'],
        summary: 'Remove stylist profile photo',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Removed' } },
      },
    },
    '/api/superadmin/stylists/{employeeId}/portfolio': {
      get: {
        tags: ['Superadmin · Stylists'],
        summary: 'List stylist portfolio (superadmin)',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Portfolio items' } },
      },
      post: {
        tags: ['Superadmin · Stylists'],
        summary: 'Request upload URL OR confirm new portfolio item',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', description: 'mimeType+sizeBytes = request URL; objectKey = confirm upload', properties: { mimeType: { type: 'string' }, sizeBytes: { type: 'integer' }, objectKey: { type: 'string' } } } } } },
        responses: { 200: { description: 'Upload target OR 201 item created' } },
      },
      patch: {
        tags: ['Superadmin · Stylists'],
        summary: 'Reorder portfolio items',
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['itemIds'], properties: { itemIds: { type: 'array', items: { type: 'string' } } } } } } },
        responses: { 200: { description: 'Reordered' } },
      },
    },
    '/api/superadmin/stylists/{employeeId}/portfolio/{itemId}': {
      patch: {
        tags: ['Superadmin · Stylists'],
        summary: 'Update portfolio item caption',
        parameters: [
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'itemId', required: true, schema: { type: 'string' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { caption: { type: 'string', nullable: true } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Superadmin · Stylists'],
        summary: 'Delete portfolio item',
        parameters: [
          { in: 'path', name: 'employeeId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'itemId', required: true, schema: { type: 'string' } },
        ],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/api/superadmin/services': {
      get: {
        tags: ['Superadmin · Services'],
        summary: 'List all services across salons',
        parameters: [
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'salonId', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Paginated services' } },
      },
    },
    '/api/superadmin/services/{serviceId}': {
      get: {
        tags: ['Superadmin · Services'],
        summary: 'Get service detail',
        parameters: [{ in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Service detail with assigned stylists' } },
      },
      patch: {
        tags: ['Superadmin · Services'],
        summary: 'Update service (isActive, name, price, etc.)',
        parameters: [{ in: 'path', name: 'serviceId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { isActive: { type: 'boolean' }, name: { type: 'string' }, priceAmount: { type: 'integer' }, durationMinutes: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/superadmin/salons/{salonId}/cover-photo': {
      post: {
        tags: ['Superadmin · Salons'],
        summary: 'Request presigned URL for salon cover photo',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['mimeType', 'sizeBytes'], properties: { mimeType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] }, sizeBytes: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Presigned URL + objectKey' } },
      },
      patch: {
        tags: ['Superadmin · Salons'],
        summary: 'Confirm cover photo upload',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['objectKey'], properties: { objectKey: { type: 'string' } } } } } },
        responses: { 200: { description: 'coverUrl saved' } },
      },
      delete: {
        tags: ['Superadmin · Salons'],
        summary: 'Remove cover photo',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Removed' } },
      },
    },
    '/api/superadmin/salons/{salonId}/logo': {
      post: {
        tags: ['Superadmin · Salons'],
        summary: 'Request presigned URL for salon logo',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['mimeType', 'sizeBytes'], properties: { mimeType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] }, sizeBytes: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Presigned URL + objectKey' } },
      },
      patch: {
        tags: ['Superadmin · Salons'],
        summary: 'Confirm logo upload',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['objectKey'], properties: { objectKey: { type: 'string' } } } } } },
        responses: { 200: { description: 'logoUrl saved' } },
      },
      delete: {
        tags: ['Superadmin · Salons'],
        summary: 'Remove logo',
        parameters: [{ in: 'path', name: 'salonId', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Removed' } },
      },
    },
    '/api/superadmin/reports': {
      get: {
        tags: ['Superadmin · Reports'],
        summary: 'Platform revenue report by salon',
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Revenue by salon' } },
      },
    },
    '/api/superadmin/reports/overview': {
      get: {
        tags: ['Superadmin · Reports'],
        summary: 'Platform overview analytics',
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Totals, reservation breakdown, revenue, completion rate' } },
      },
    },
    '/api/superadmin/reports/salons': {
      get: {
        tags: ['Superadmin · Reports'],
        summary: 'Per-salon performance report',
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Per-salon stats' } },
      },
    },
    '/api/superadmin/reports/stylists': {
      get: {
        tags: ['Superadmin · Reports'],
        summary: 'Per-stylist performance report',
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'salonId', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Per-stylist stats' } },
      },
    },
    '/api/superadmin/reports/services': {
      get: {
        tags: ['Superadmin · Reports'],
        summary: 'Per-service performance report',
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'salonId', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Per-service stats' } },
      },
    },
    '/api/superadmin/reports/customers': {
      get: {
        tags: ['Superadmin · Reports'],
        summary: 'Customer analytics',
        parameters: [
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'salonId', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Customer booking stats + summary' } },
      },
    },
    '/api/superadmin/reports/audit-logs': {
      get: {
        tags: ['Superadmin · Reports'],
        summary: 'Platform-wide audit log',
        parameters: [
          { in: 'query', name: 'salonId', schema: { type: 'string' } },
          { in: 'query', name: 'actorUserId', schema: { type: 'string' } },
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
        ],
        responses: { 200: { description: 'Audit log entries' } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
