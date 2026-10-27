const express = require('express');

function createApp(store) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Equipment CRUD
  app.get('/api/equipment', async (req, res, next) => {
    try {
      res.json(await store.listEquipment());
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/equipment/:id', async (req, res, next) => {
    try {
      const item = await store.getEquipmentById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Equipment not found' });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/equipment', async (req, res, next) => {
    try {
      const { name, category, quantity, price } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Valid name is required' });
      }
      if (!category || typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({ error: 'Valid category is required' });
      }
      if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'Quantity must be a non-negative integer' });
      }
      if (price === undefined || typeof price !== 'number' || isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
      }
      const item = await store.createEquipment({ name: name.trim(), category: category.trim(), quantity, price });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/equipment/:id', async (req, res, next) => {
    try {
      const { name, category, quantity, price } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Valid name is required' });
      }
      if (!category || typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({ error: 'Valid category is required' });
      }
      if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'Quantity must be a non-negative integer' });
      }
      if (price === undefined || typeof price !== 'number' || isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
      }
      const item = await store.updateEquipment(req.params.id, { name: name.trim(), category: category.trim(), quantity, price });
      if (!item) return res.status(404).json({ error: 'Equipment not found' });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/equipment/:id', async (req, res, next) => {
    try {
      const deleted = await store.deleteEquipment(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Equipment not found' });
      res.json({ message: 'Equipment deleted' });
    } catch (err) {
      next(err);
    }
  });

  // Orders CRUD
  app.get('/api/orders', async (req, res, next) => {
    try {
      res.json(await store.listOrders());
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/orders/:id', async (req, res, next) => {
    try {
      const order = await store.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/orders', async (req, res, next) => {
    try {
      const { equipmentId, quantity, status } = req.body;
      if (equipmentId === undefined || !Number.isInteger(Number(equipmentId)) || Number(equipmentId) <= 0) {
        return res.status(400).json({ error: 'Valid equipmentId is required' });
      }
      if (quantity === undefined || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
      }
      if (status !== undefined && (typeof status !== 'string' || !status.trim())) {
        return res.status(400).json({ error: 'Status must be a non-empty string' });
      }
      const order = await store.createOrder({
        equipmentId: Number(equipmentId),
        quantity,
        status: status ? status.trim() : 'pending'
      });
      res.status(201).json(order);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });

  app.put('/api/orders/:id', async (req, res, next) => {
    try {
      const { equipmentId, quantity, status } = req.body;
      if (status === undefined && equipmentId === undefined && quantity === undefined) {
        return res.status(400).json({ error: 'At least one field to update is required' });
      }
      if (status !== undefined && (typeof status !== 'string' || !status.trim())) {
        return res.status(400).json({ error: 'Status must be a non-empty string' });
      }
      if (quantity !== undefined && (!Number.isInteger(quantity) || quantity <= 0)) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
      }
      if (equipmentId !== undefined && (!Number.isInteger(Number(equipmentId)) || Number(equipmentId) <= 0)) {
        return res.status(400).json({ error: 'Valid equipmentId is required' });
      }
      const order = await store.updateOrder(req.params.id, {
        ...(equipmentId !== undefined && { equipmentId: Number(equipmentId) }),
        ...(quantity !== undefined && { quantity }),
        ...(status !== undefined && { status: status.trim() })
      });
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/orders/:id', async (req, res, next) => {
    try {
      const deleted = await store.deleteOrder(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Order not found' });
      res.json({ message: 'Order deleted' });
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

createApp.createApp = createApp;
module.exports = createApp;
module.exports.createApp = createApp;
