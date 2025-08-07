import z from "zod";

export const RoomSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  capacity: z.number().nullable(),
  equipment: z.string().nullable(),
  location_x: z.number().nullable(),
  location_y: z.number().nullable(),
  is_active: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const BookingSchema = z.object({
  id: z.number(),
  room_id: z.number(),
  user_id: z.string(),
  user_email: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  start_time: z.string(),
  end_time: z.string(),
  is_cancelled: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  room_name: z.string().optional(),
});

export const OfficeMapSchema = z.object({
  id: z.number(),
  filename: z.string(),
  original_name: z.string(),
  file_url: z.string(),
  is_active: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Room = z.infer<typeof RoomSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type OfficeMap = z.infer<typeof OfficeMapSchema>;

export const CreateRoomSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  equipment: z.string().optional(),
  location_x: z.number().optional(),
  location_y: z.number().optional(),
});

export const CreateBookingSchema = z.object({
  room_id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
});

export type CreateRoom = z.infer<typeof CreateRoomSchema>;
export type CreateBooking = z.infer<typeof CreateBookingSchema>;
