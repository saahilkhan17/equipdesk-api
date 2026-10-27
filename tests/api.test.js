const request = require('supertest');
const createApp = require('../src/app');
const { MemoryStore } = require('../src/store');

describe('equipdesk-api', () => {
  let app;
  let store;

  beforeEach(() => {
    store = new MemoryStore();
    app = createApp(store);
  });

  test('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('POST /api/equipment creates new equipment', async () => {
    const payload = {
      name: 'Hydraulic Excavator',
      category: 'Heavy Machinery',
      quantity: 5,
      price: 85000.00
    };
    const res = await request(app).post('/api/equipment').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      name: 'Hydraulic Excavator',
      category: 'Heavy Machinery',
      quantity: 5,
      price: 85000.00
    });
  });

  test('POST /api/equipment validates required fields and types (400)', async () => {
    const res1 = await request(app).post('/api/equipment').send({
      category: 'Tools',
      quantity: 2,
      price: 100
    });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post('/api/equipment').send({
      name: 'Drill',
      category: 'Tools',
      quantity: -1,
      price: 100
    });
    expect(res2.status).toBe(400);

    const res3 = await request(app).post('/api/equipment').send({
      name: 'Drill',
      category: 'Tools',
      quantity: 2,
      price: -50
    });
    expect(res3.status).toBe(400);
  });

  test('GET /api/equipment returns all equipment', async () => {
    await store.createEquipment({ name: 'Forklift', category: 'Lifting', quantity: 3, price: 25000 });
    await store.createEquipment({ name: 'Welder', category: 'Fabrication', quantity: 10, price: 1200 });

    const res = await request(app).get('/api/equipment');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test('GET /api/equipment/:id returns item or 404', async () => {
    const created = await store.createEquipment({ name: 'Compressor', category: 'Pneumatics', quantity: 4, price: 3000 });

    const resSuccess = await request(app).get(`/api/equipment/${created.id}`);
    expect(resSuccess.status).toBe(200);
    expect(resSuccess.body.name).toBe('Compressor');

    const resNotFound = await request(app).get('/api/equipment/999');
    expect(resNotFound.status).toBe(404);
  });

  test('PUT /api/equipment/:id updates equipment or returns 404/400', async () => {
    const created = await store.createEquipment({ name: 'Generator', category: 'Power', quantity: 2, price: 4500 });

    const resUpdate = await request(app).put(`/api/equipment/${created.id}`).send({
      name: 'Generator HD',
      category: 'Power',
      quantity: 6,
      price: 4900
    });
    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.name).toBe('Generator HD');
    expect(resUpdate.body.quantity).toBe(6);

    const res404 = await request(app).put('/api/equipment/999').send({
      name: 'Generator HD',
      category: 'Power',
      quantity: 6,
      price: 4900
    });
    expect(res404.status).toBe(404);

    const res400 = await request(app).put(`/api/equipment/${created.id}`).send({
      name: '',
      category: 'Power',
      quantity: 6,
      price: 4900
    });
    expect(res400.status).toBe(400);
  });

  test('DELETE /api/equipment/:id removes equipment or returns 404', async () => {
    const created = await store.createEquipment({ name: 'Lathe', category: 'Machining', quantity: 1, price: 15000 });

    const resDelete = await request(app).delete(`/api/equipment/${created.id}`);
    expect(resDelete.status).toBe(200);

    const resCheck = await request(app).get(`/api/equipment/${created.id}`);
    expect(resCheck.status).toBe(404);

    const resNotFound = await request(app).delete('/api/equipment/999');
    expect(resNotFound.status).toBe(404);
  });

  test('POST /api/orders creates order and decrements equipment stock', async () => {
    const equip = await store.createEquipment({
      name: 'Safety Helmets (Box of 50)',
      category: 'Safety',
      quantity: 10,
      price: 250
    });

    const resOrder = await request(app).post('/api/orders').send({
      equipmentId: equip.id,
      quantity: 3
    });

    expect(resOrder.status).toBe(201);
    expect(resOrder.body).toMatchObject({
      id: 1,
      equipmentId: equip.id,
      quantity: 3,
      status: 'pending'
    });

    const updatedEquip = await store.getEquipmentById(equip.id);
    expect(updatedEquip.quantity).toBe(7);
  });

  test('POST /api/orders returns 400 when insufficient stock', async () => {
    const equip = await store.createEquipment({
      name: 'Angle Grinder',
      category: 'Tools',
      quantity: 2,
      price: 150
    });

    const res = await request(app).post('/api/orders').send({
      equipmentId: equip.id,
      quantity: 5
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient stock/i);

    const equipAfter = await store.getEquipmentById(equip.id);
    expect(equipAfter.quantity).toBe(2);
  });

  test('POST /api/orders returns 404 when equipment does not exist', async () => {
    const res = await request(app).post('/api/orders').send({
      equipmentId: 999,
      quantity: 1
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/equipment not found/i);
  });

  test('POST /api/orders validates invalid payload (400)', async () => {
    const res1 = await request(app).post('/api/orders').send({
      quantity: 2
    });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post('/api/orders').send({
      equipmentId: 1,
      quantity: 0
    });
    expect(res2.status).toBe(400);
  });

  test('GET /api/orders and GET /api/orders/:id', async () => {
    const equip = await store.createEquipment({ name: 'Valve', category: 'Piping', quantity: 20, price: 80 });
    const order = await store.createOrder({ equipmentId: equip.id, quantity: 2 });

    const listRes = await request(app).get('/api/orders');
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(1);

    const singleRes = await request(app).get(`/api/orders/${order.id}`);
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.id).toBe(order.id);

    const notFoundRes = await request(app).get('/api/orders/999');
    expect(notFoundRes.status).toBe(404);
  });

  test('PUT /api/orders/:id updates status or returns 404/400', async () => {
    const equip = await store.createEquipment({ name: 'Pump', category: 'Hydraulics', quantity: 5, price: 500 });
    const order = await store.createOrder({ equipmentId: equip.id, quantity: 1 });

    const resUpdate = await request(app).put(`/api/orders/${order.id}`).send({
      status: 'shipped'
    });
    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.status).toBe('shipped');

    const res404 = await request(app).put('/api/orders/999').send({ status: 'cancelled' });
    expect(res404.status).toBe(404);

    const res400 = await request(app).put(`/api/orders/${order.id}`).send({ status: '' });
    expect(res400.status).toBe(400);
  });

  test('DELETE /api/orders/:id removes order or returns 404', async () => {
    const equip = await store.createEquipment({ name: 'Bearing', category: 'Mechanical', quantity: 50, price: 20 });
    const order = await store.createOrder({ equipmentId: equip.id, quantity: 5 });

    const resDelete = await request(app).delete(`/api/orders/${order.id}`);
    expect(resDelete.status).toBe(200);

    const resCheck = await request(app).get(`/api/orders/${order.id}`);
    expect(resCheck.status).toBe(404);

    const resNotFound = await request(app).delete('/api/orders/999');
    expect(resNotFound.status).toBe(404);
  });
});
