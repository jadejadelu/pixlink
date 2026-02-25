const db = require('../database/db');

class RoomService {
  constructor() {
    this.rooms = new Map();
  }

  async createRoom(roomData) {
    const { name, description, capacity } = roomData;
    
    const result = await db.query(
      'INSERT INTO rooms (name, description, capacity, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [name, description, capacity]
    );

    return result.rows[0];
  }

  async getRoomById(roomId) {
    const result = await db.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (result.rows.length === 0) {
      throw new Error('Room not found');
    }
    return result.rows[0];
  }

  async getAllRooms() {
    const result = await db.query('SELECT * FROM rooms ORDER BY created_at DESC');
    return result.rows;
  }

  async updateRoom(roomId, updates) {
    const { name, description, capacity } = updates;
    const result = await db.query(
      'UPDATE rooms SET name = $1, description = $2, capacity = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, description, capacity, roomId]
    );
    if (result.rows.length === 0) {
      throw new Error('Room not found');
    }
    return result.rows[0];
  }

  async deleteRoom(roomId) {
    const result = await db.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [roomId]);
    if (result.rows.length === 0) {
      throw new Error('Room not found');
    }
    return result.rows[0];
  }

  async addUserToRoom(roomId, userId) {
    const result = await db.query(
      'INSERT INTO room_members (room_id, user_id, joined_at) VALUES ($1, $2, NOW()) RETURNING *',
      [roomId, userId]
    );
    return result.rows[0];
  }

  async removeUserFromRoom(roomId, userId) {
    const result = await db.query(
      'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2 RETURNING *',
      [roomId, userId]
    );
    if (result.rows.length === 0) {
      throw new Error('User not found in room');
    }
    return result.rows[0];
  }

  async getRoomMembers(roomId) {
    const result = await db.query(
      'SELECT u.id, u.username, u.email FROM users u JOIN room_members rm ON u.id = rm.user_id WHERE rm.room_id = $1',
      [roomId]
    );
    return result.rows;
  }
}

module.exports = new RoomService();