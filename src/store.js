const mysql = require('mysql2/promise');

class MemoryStore {
  constructor() {
    this.equipment = [];
    this.orders = [];
    this.nextEquipmentId = 1;
    this.nextOrderId = 1;
  }

  async listEquipment() {
    return this.equipment.map(e => ({ ...e }));
  }

  async getEquipmentById(id) {
    const item = this.equipment.find(e => e.id === Number(id));
    return item ? { ...item } : null;
  }

  async createEquipment({ name, category, quantity, price }) {
    const item = {
      id: this.nextEquipmentId++,
      name: String(name),
      category: String(category),
      quantity: Number(quantity),
      price: Number(price)
    };
    this.equipment.push(item);
    return { ...item };
  }

  async updateEquipment(id, { name, category, quantity, price }) {
    const item = this.equipment.find(e => e.id === Number(id));
    if (!item) return null;
    if (name !== undefined) item.name = String(name);
    if (category !== undefined) item.category = String(category);
    if (quantity !== undefined) item.quantity = Number(quantity);
    if (price !== undefined) item.price = Number(price);
    return { ...item };
  }

  async deleteEquipment(id) {
    const idx = this.equipment.findIndex(e => e.id === Number(id));
    if (idx === -1) return false;
    this.equipment.splice(idx, 1);
    return true;
  }

  async listOrders() {
    return this.orders.map(o => ({ ...o }));
  }

  async getOrderById(id) {
    const order = this.orders.find(o => o.id === Number(id));
    return order ? { ...order } : null;
  }

  async createOrder({ equipmentId, quantity, status = 'pending' }) {
    const equip = this.equipment.find(e => e.id === Number(equipmentId));
    if (!equip) {
      const err = new Error('Equipment not found');
      err.status = 404;
      throw err;
    }
    if (equip.quantity < Number(quantity)) {
      const err = new Error('Insufficient stock');
      err.status = 400;
      throw err;
    }
    equip.quantity -= Number(quantity);
    const order = {
      id: this.nextOrderId++,
      equipmentId: Number(equipmentId),
      quantity: Number(quantity),
      status: status || 'pending'
    };
    this.orders.push(order);
    return { ...order };
  }

  async updateOrder(id, { equipmentId, quantity, status }) {
    const order = this.orders.find(o => o.id === Number(id));
    if (!order) return null;
    if (equipmentId !== undefined) order.equipmentId = Number(equipmentId);
    if (quantity !== undefined) order.quantity = Number(quantity);
    if (status !== undefined) order.status = String(status);
    return { ...order };
  }

  async deleteOrder(id) {
    const idx = this.orders.findIndex(o => o.id === Number(id));
    if (idx === -1) return false;
    this.orders.splice(idx, 1);
    return true;
  }
}

class MySQLStore {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'equipdesk',
      waitForConnections: true,
      connectionLimit: 10
    });
  }

  async listEquipment() {
    const [rows] = await this.pool.query('SELECT * FROM equipment');
    return rows.map(r => ({ ...r, id: Number(r.id), quantity: Number(r.quantity), price: Number(r.price) }));
  }

  async getEquipmentById(id) {
    const [rows] = await this.pool.query('SELECT * FROM equipment WHERE id = ?', [id]);
    if (!rows.length) return null;
    const r = rows[0];
    return { ...r, id: Number(r.id), quantity: Number(r.quantity), price: Number(r.price) };
  }

  async createEquipment({ name, category, quantity, price }) {
    const [res] = await this.pool.query(
      'INSERT INTO equipment (name, category, quantity, price) VALUES (?, ?, ?, ?)',
      [name, category, quantity, price]
    );
    return { id: res.insertId, name, category, quantity: Number(quantity), price: Number(price) };
  }

  async updateEquipment(id, { name, category, quantity, price }) {
    const existing = await this.getEquipmentById(id);
    if (!existing) return null;
    const updated = {
      name: name ?? existing.name,
      category: category ?? existing.category,
      quantity: quantity !== undefined ? Number(quantity) : existing.quantity,
      price: price !== undefined ? Number(price) : existing.price
    };
    await this.pool.query(
      'UPDATE equipment SET name = ?, category = ?, quantity = ?, price = ? WHERE id = ?',
      [updated.name, updated.category, updated.quantity, updated.price, id]
    );
    return { id: Number(id), ...updated };
  }

  async deleteEquipment(id) {
    const [res] = await this.pool.query('DELETE FROM equipment WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }

  async listOrders() {
    const [rows] = await this.pool.query('SELECT * FROM orders');
    return rows.map(r => ({ ...r, id: Number(r.id), equipmentId: Number(r.equipmentId), quantity: Number(r.quantity) }));
  }

  async getOrderById(id) {
    const [rows] = await this.pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return null;
    const r = rows[0];
    return { ...r, id: Number(r.id), equipmentId: Number(r.equipmentId), quantity: Number(r.quantity) };
  }

  async createOrder({ equipmentId, quantity, status = 'pending' }) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query('SELECT * FROM equipment WHERE id = ? FOR UPDATE', [equipmentId]);
      if (!rows.length) {
        const err = new Error('Equipment not found');
        err.status = 404;
        throw err;
      }
      if (Number(rows[0].quantity) < Number(quantity)) {
        const err = new Error('Insufficient stock');
        err.status = 400;
        throw err;
      }
      await conn.query('UPDATE equipment SET quantity = quantity - ? WHERE id = ?', [quantity, equipmentId]);
      const orderStatus = status || 'pending';
      const [res] = await conn.query(
        'INSERT INTO orders (equipmentId, quantity, status) VALUES (?, ?, ?)',
        [equipmentId, quantity, orderStatus]
      );
      await conn.commit();
      return { id: res.insertId, equipmentId: Number(equipmentId), quantity: Number(quantity), status: orderStatus };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async updateOrder(id, { equipmentId, quantity, status }) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;
    const updated = {
      equipmentId: equipmentId !== undefined ? Number(equipmentId) : existing.equipmentId,
      quantity: quantity !== undefined ? Number(quantity) : existing.quantity,
      status: status ?? existing.status
    };
    await this.pool.query(
      'UPDATE orders SET equipmentId = ?, quantity = ?, status = ? WHERE id = ?',
      [updated.equipmentId, updated.quantity, updated.status, id]
    );
    return { id: Number(id), ...updated };
  }

  async deleteOrder(id) {
    const [res] = await this.pool.query('DELETE FROM orders WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }
}

function getStore() {
  return process.env.MYSQL_HOST ? new MySQLStore() : new MemoryStore();
}

getStore.getStore = getStore;
getStore.MySQLStore = MySQLStore;
getStore.MemoryStore = MemoryStore;

module.exports = getStore;
module.exports.getStore = getStore;
module.exports.MySQLStore = MySQLStore;
module.exports.MemoryStore = MemoryStore;
