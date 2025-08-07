import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getCookie, setCookie } from "hono/cookie";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Auth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Rooms endpoints
app.get('/api/rooms', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM rooms WHERE is_active = 1 ORDER BY name'
  ).all();

  return c.json(results);
});

const createRoomSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  equipment: z.string().optional(),
  location_x: z.number().optional(),
  location_y: z.number().optional(),
});

app.post('/api/rooms', authMiddleware, zValidator('json', createRoomSchema), async (c) => {
  const data = c.req.valid('json');
  
  const result = await c.env.DB.prepare(`
    INSERT INTO rooms (name, description, capacity, equipment, location_x, location_y)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    data.name,
    data.description || null,
    data.capacity || null,
    data.equipment || null,
    data.location_x || null,
    data.location_y || null
  ).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

// Bookings endpoints
app.get('/api/bookings', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT b.*, r.name as room_name 
    FROM bookings b 
    JOIN rooms r ON b.room_id = r.id 
    WHERE b.is_cancelled = 0 
    ORDER BY b.start_time
  `).all();

  return c.json(results);
});

const createBookingSchema = z.object({
  room_id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
});

app.post('/api/bookings', authMiddleware, zValidator('json', createBookingSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user')!;
  
  // Check for conflicts
  const { results: conflicts } = await c.env.DB.prepare(`
    SELECT id FROM bookings 
    WHERE room_id = ? AND is_cancelled = 0 
    AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
  `).bind(
    data.room_id,
    data.start_time, data.start_time,
    data.end_time, data.end_time
  ).all();

  if (conflicts.length > 0) {
    return c.json({ error: 'Комната уже забронирована на это время' }, 409);
  }
  
  const result = await c.env.DB.prepare(`
    INSERT INTO bookings (room_id, user_id, user_email, title, description, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.room_id,
    user.id,
    user.email,
    data.title,
    data.description || null,
    data.start_time,
    data.end_time
  ).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

// Office map endpoints
app.get('/api/office-map', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM office_maps WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
  ).all();

  return c.json(results[0] || null);
});

// Admin middleware to check if user has admin role
const adminMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Check if user has admin role
  const { results } = await c.env.DB.prepare(
    'SELECT role FROM user_roles WHERE user_id = ? AND role = "admin"'
  ).bind(user.id).all();

  if (results.length === 0) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
};

// Admin endpoints
app.get('/api/admin/check-access', authMiddleware, async (c) => {
  const user = c.get('user')!;
  
  const { results } = await c.env.DB.prepare(
    'SELECT role FROM user_roles WHERE user_id = ? AND role = "admin"'
  ).bind(user.id).all();

  if (results.length === 0) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  return c.json({ success: true });
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (c) => {
  try {
    const [usersCount, roomsCount, bookingsCount, todayBookingsCount] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM user_roles').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM rooms WHERE is_active = 1').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM bookings WHERE is_cancelled = 0').first(),
      c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM bookings 
        WHERE is_cancelled = 0 AND DATE(start_time) = DATE('now')
      `).first()
    ]);

    return c.json({
      totalUsers: usersCount?.count || 0,
      totalRooms: roomsCount?.count || 0,
      totalBookings: bookingsCount?.count || 0,
      activeBookingsToday: todayBookingsCount?.count || 0
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM user_roles ORDER BY created_at DESC'
  ).all();

  return c.json(results);
});

const addUserRoleSchema = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
});

app.post('/api/admin/users', authMiddleware, adminMiddleware, zValidator('json', addUserRoleSchema), async (c) => {
  const data = c.req.valid('json');
  const currentUser = c.get('user')!;

  try {
    // Check if user role already exists
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM user_roles WHERE user_email = ?'
    ).bind(data.email).all();

    if (existing.length > 0) {
      return c.json({ error: 'Пользователь уже имеет назначенную роль' }, 409);
    }

    // Create a temporary user ID for email-based users (they need to login first)
    const result = await c.env.DB.prepare(`
      INSERT INTO user_roles (user_id, user_email, role, granted_by)
      VALUES (?, ?, ?, ?)
    `).bind(
      `email:${data.email}`,
      data.email,
      data.role,
      currentUser.email
    ).run();

    return c.json({ id: result.meta.last_row_id }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to add user role' }, 500);
  }
});

const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['user', 'admin']),
});

app.put('/api/admin/users/role', authMiddleware, adminMiddleware, zValidator('json', updateUserRoleSchema), async (c) => {
  const data = c.req.valid('json');
  const currentUser = c.get('user')!;

  try {
    await c.env.DB.prepare(`
      UPDATE user_roles 
      SET role = ?, granted_by = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).bind(data.role, currentUser.email, data.userId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

app.get('/api/admin/rooms', authMiddleware, adminMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM rooms ORDER BY name'
  ).all();

  return c.json(results);
});

app.post('/api/admin/rooms', authMiddleware, adminMiddleware, zValidator('json', createRoomSchema), async (c) => {
  const data = c.req.valid('json');
  
  const result = await c.env.DB.prepare(`
    INSERT INTO rooms (name, description, capacity, equipment, location_x, location_y)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    data.name,
    data.description || null,
    data.capacity || null,
    data.equipment || null,
    data.location_x || null,
    data.location_y || null
  ).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

app.delete('/api/admin/rooms/:id', authMiddleware, adminMiddleware, async (c) => {
  const roomId = c.req.param('id');
  
  // Check if room has active bookings
  const { results: bookings } = await c.env.DB.prepare(`
    SELECT id FROM bookings 
    WHERE room_id = ? AND is_cancelled = 0 AND datetime(end_time) > datetime('now')
  `).bind(roomId).all();

  if (bookings.length > 0) {
    return c.json({ error: 'Нельзя удалить комнату с активными бронированиями' }, 409);
  }

  await c.env.DB.prepare('UPDATE rooms SET is_active = 0 WHERE id = ?').bind(roomId).run();
  
  return c.json({ success: true });
});

app.get('/api/admin/office-map', authMiddleware, adminMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM office_maps WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
  ).all();

  return c.json(results[0] || null);
});

app.post('/api/admin/office-map', authMiddleware, adminMiddleware, async (c) => {
  const body = await c.req.formData();
  const file = body.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'Файл не найден' }, 400);
  }

  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'Файл должен быть изображением' }, 400);
  }

  // In a real implementation, you'd upload to object storage (R2, S3, etc.)
  // For now, we'll create a data URL
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const dataUrl = `data:${file.type};base64,${base64}`;

  // Deactivate previous maps
  await c.env.DB.prepare('UPDATE office_maps SET is_active = 0').run();

  // Insert new map
  const result = await c.env.DB.prepare(`
    INSERT INTO office_maps (filename, original_name, file_url)
    VALUES (?, ?, ?)
  `).bind(
    `office-map-${Date.now()}.${file.name.split('.').pop()}`,
    file.name,
    dataUrl
  ).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

// File upload endpoint for office map
app.post('/api/office-map', authMiddleware, async (c) => {
  const body = await c.req.formData();
  const file = body.get('file') as File;
  
  if (!file) {
    return c.json({ error: 'Файл не найден' }, 400);
  }

  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'Файл должен быть изображением' }, 400);
  }

  // In a real implementation, you'd upload to object storage (R2, S3, etc.)
  // For now, we'll create a data URL
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  const dataUrl = `data:${file.type};base64,${base64}`;

  // Deactivate previous maps
  await c.env.DB.prepare('UPDATE office_maps SET is_active = 0').run();

  // Insert new map
  const result = await c.env.DB.prepare(`
    INSERT INTO office_maps (filename, original_name, file_url)
    VALUES (?, ?, ?)
  `).bind(
    `office-map-${Date.now()}.${file.name.split('.').pop()}`,
    file.name,
    dataUrl
  ).run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

export default app;
