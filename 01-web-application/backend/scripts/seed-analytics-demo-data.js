/**
 * Seed demo customers (Student + Employed) with pastOrders from active inventory.
 * Feeds admin analytics: employment, best sellers, dashboard totals, gender, age.
 *
 * Usage (from 01-web-application/backend):
 *   node scripts/seed-analytics-demo-data.js --confirm
 *   node scripts/seed-analytics-demo-data.js --confirm --clear
 *   node scripts/seed-analytics-demo-data.js --confirm --students 60 --employed 60
 *
 * Requires MONGO_URI in .env (same DB as nomu-backend / mobile-backend).
 * Seed users: *@nomu-analytics-seed.test (password: SeedNomu2026!)
 */

const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const InventoryItem = require('../models/InventoryItem');

const SEED_EMAIL_DOMAIN = '@nomu-analytics-seed.test';
const SEED_PASSWORD = 'SeedNomu2026!';
const DEFAULT_STUDENTS = 50;
const DEFAULT_EMPLOYED = 50;

const FIRST_NAMES = [
  'Maria', 'Juan', 'Ana', 'Jose', 'Liza', 'Mark', 'Grace', 'Paolo', 'Joy', 'Ryan',
  'Kim', 'Nina', 'Carlo', 'Ella', 'Miguel', 'Sofia', 'Andre', 'Bea', 'Luis', 'Maya'
];
const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Garcia', 'Torres', 'Ramos', 'Flores', 'Mendoza', 'Lopez', 'Rivera',
  'Diaz', 'Aquino', 'Castillo', 'Navarro', 'Villanueva', 'Fernandez', 'Bautista', 'Domingo', 'Pascual', 'Morales'
];

function parseArgs(argv) {
  const args = {
    confirm: false,
    clear: false,
    students: DEFAULT_STUDENTS,
    employed: DEFAULT_EMPLOYED,
    minOrders: 4,
    maxOrders: 14
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--confirm') args.confirm = true;
    else if (a === '--clear') args.clear = true;
    else if (a === '--students') args.students = Math.max(0, parseInt(argv[++i], 10) || DEFAULT_STUDENTS);
    else if (a === '--employed') args.employed = Math.max(0, parseInt(argv[++i], 10) || DEFAULT_EMPLOYED);
    else if (a === '--min-orders') args.minOrders = Math.max(1, parseInt(argv[++i], 10) || 4);
    else if (a === '--max-orders') args.maxOrders = Math.max(args.minOrders, parseInt(argv[++i], 10) || 14);
  }
  return args;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function categoryToItemType(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'donuts') return 'donut';
  if (c === 'pizzas') return 'pizza';
  if (c === 'pastries') return 'pastry';
  return 'drink';
}

function randomBirthdayForEmployment(employmentStatus) {
  const now = new Date();
  if (employmentStatus === 'Student') {
    const age = randInt(18, 25);
    const y = now.getFullYear() - age;
    const m = String(randInt(1, 12)).padStart(2, '0');
    const d = String(randInt(1, 28)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const age = randInt(26, 45);
  const y = now.getFullYear() - age;
  const m = String(randInt(1, 12)).padStart(2, '0');
  const d = String(randInt(1, 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function randomOrderDate(daysBackMax = 120) {
  const daysAgo = randInt(0, daysBackMax);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randInt(8, 21), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

function buildLineItems(inventoryPool, lineCount) {
  const items = [];
  let subtotal = 0;
  const used = new Set();
  for (let i = 0; i < lineCount; i++) {
    let inv = pick(inventoryPool);
    let guard = 0;
    while (used.has(inv.name) && guard < 12) {
      inv = pick(inventoryPool);
      guard++;
    }
    used.add(inv.name);
    const qty = randInt(1, 3);
    const price = Number(inv.firstPrice) > 0 ? Number(inv.firstPrice) : randInt(80, 220);
    subtotal += price * qty;
    items.push({
      itemName: inv.name,
      itemType: categoryToItemType(inv.category),
      category: inv.category,
      price,
      quantity: qty
    });
  }
  return { items, totalPrice: Math.round(subtotal * 100) / 100 };
}

function buildPastOrders(inventoryPool, orderCount) {
  const orders = [];
  for (let i = 0; i < orderCount; i++) {
    const lineCount = randInt(1, 4);
    const { items, totalPrice } = buildLineItems(inventoryPool, lineCount);
    orders.push({
      orderId: `seed_order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      cycle: 1,
      items,
      totalPrice,
      date: randomOrderDate(150)
    });
  }
  orders.sort((a, b) => a.date - b.date);
  return orders;
}

function inventoryPoolForEmployment(allItems, employmentStatus) {
  const byCat = { Donuts: [], Drinks: [], Pastries: [], Pizzas: [] };
  allItems.forEach((inv) => {
    if (byCat[inv.category]) byCat[inv.category].push(inv);
  });
  const pool = [];
  const weights =
    employmentStatus === 'Student'
      ? { Drinks: 4, Pastries: 3, Donuts: 2, Pizzas: 1 }
      : { Drinks: 3, Pastries: 2, Donuts: 2, Pizzas: 2 };
  Object.entries(weights).forEach(([cat, w]) => {
    const list = byCat[cat] || [];
    for (let i = 0; i < w; i++) {
      list.forEach((item) => pool.push(item));
    }
  });
  return pool.length > 0 ? pool : allItems;
}

async function connectDb() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set. Add it to 01-web-application/backend/.env');
  }
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

async function loadInventory() {
  const items = await InventoryItem.find({
    status: 'active',
    firstPrice: { $gt: 0 }
  })
    .select('name category firstPrice')
    .lean();

  if (items.length === 0) {
    const fallback = await InventoryItem.find({ status: 'active' }).select('name category firstPrice').lean();
    return fallback.map((row) => ({
      ...row,
      firstPrice: Number(row.firstPrice) > 0 ? row.firstPrice : randInt(90, 250)
    }));
  }
  return items;
}

async function clearPreviousSeed(usersCol) {
  const res = await usersCol.deleteMany({
    email: { $regex: /@nomu-analytics-seed\.test$/i }
  });
  console.log(`Removed ${res.deletedCount} previous seed customer(s)`);
}

async function buildSeedUsers(inventory, counts, args) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const usersCol = mongoose.connection.collection('users');
  const docs = [];
  let studentIdx = 0;
  let employedIdx = 0;

  const makeUser = (employmentStatus, index) => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const slug = employmentStatus === 'Student' ? 'student' : 'employed';
    const num = String(index + 1).padStart(3, '0');
    const email = `seed.${slug}.${num}${SEED_EMAIL_DOMAIN}`;
    const username = `seed_${slug}_${num}`;
    const orderCount = randInt(args.minOrders, args.maxOrders);
    const pool = inventoryPoolForEmployment(inventory, employmentStatus);
    const pastOrders = buildPastOrders(pool, orderCount);
    const createdAt = randomOrderDate(180);

    return {
      fullName: `${first} ${last}`,
      username,
      email,
      role: 'Customer',
      birthday: randomBirthdayForEmployment(employmentStatus),
      gender: Math.random() < 0.52 ? 'Female' : 'Male',
      employmentStatus,
      profilePicture: '',
      password: passwordHash,
      points: randInt(0, 9),
      currentCycle: 1,
      reviewPoints: 0,
      lastOrder: pastOrders.length ? pastOrders[pastOrders.length - 1].items[0].itemName : '',
      qrToken: uuidv4(),
      pastOrders,
      rewardsHistory: [],
      createdAt,
      updatedAt: new Date()
    };
  };

  for (let i = 0; i < counts.students; i++) {
    docs.push(makeUser('Student', studentIdx++));
  }
  for (let i = 0; i < counts.employed; i++) {
    docs.push(makeUser('Employed', employedIdx++));
  }

  if (docs.length === 0) {
    return { inserted: 0, orderTotal: 0, lineTotal: 0 };
  }

  const insertResult = await usersCol.insertMany(docs, { ordered: false });
  let orderTotal = 0;
  let lineTotal = 0;
  docs.forEach((u) => {
    orderTotal += u.pastOrders.length;
    u.pastOrders.forEach((o) => {
      lineTotal += (o.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
    });
  });

  return {
    inserted: insertResult.insertedCount,
    orderTotal,
    lineTotal,
    revenue: docs.reduce(
      (sum, u) => sum + u.pastOrders.reduce((s, o) => s + (o.totalPrice || 0), 0),
      0
    )
  };
}

async function printSummary() {
  const usersCol = mongoose.connection.collection('users');
  const [studentCount, employedCount, orderAgg] = await Promise.all([
    usersCol.countDocuments({
      role: 'Customer',
      employmentStatus: 'Student',
      email: { $regex: /@nomu-analytics-seed\.test$/i }
    }),
    usersCol.countDocuments({
      role: 'Customer',
      employmentStatus: 'Employed',
      email: { $regex: /@nomu-analytics-seed\.test$/i }
    }),
    usersCol
      .aggregate([
        { $match: { email: { $regex: /@nomu-analytics-seed\.test$/i } } },
        { $unwind: '$pastOrders' },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$pastOrders.totalPrice' }
          }
        }
      ])
      .toArray()
  ]);

  const totals = orderAgg[0] || { orders: 0, revenue: 0 };
  console.log('\n--- Seed summary ---');
  console.log(`Students: ${studentCount}`);
  console.log(`Employed: ${employedCount}`);
  console.log(`Past orders: ${totals.orders}`);
  console.log(`Revenue (pastOrders.totalPrice): PHP ${Number(totals.revenue || 0).toFixed(2)}`);
  console.log('Login password for seed accounts:', SEED_PASSWORD);
  console.log('Emails: *@nomu-analytics-seed.test');
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.confirm) {
    console.error('Refusing to run without --confirm (writes to your MongoDB).');
    console.error('Example: node scripts/seed-analytics-demo-data.js --confirm');
    process.exit(1);
  }

  await connectDb();
  try {
    const inventory = await loadInventory();
    if (inventory.length === 0) {
      throw new Error('No inventory items found. Add active inventory in admin first.');
    }
    console.log(`Using ${inventory.length} inventory item(s) for order lines`);

    const usersCol = mongoose.connection.collection('users');
    if (args.clear) {
      await clearPreviousSeed(usersCol);
    }

    const result = await buildSeedUsers(inventory, { students: args.students, employed: args.employed }, args);
    console.log(`Inserted ${result.inserted} customer(s)`);
    console.log(`Created ${result.orderTotal} pastOrders (${result.lineTotal} line items)`);
    console.log(`Total order value: PHP ${result.revenue.toFixed(2)}`);

    await printSummary();
    console.log('\nAdmin analytics fed via users.pastOrders (same path as barista scans).');
    console.log('Refresh Customer Feedback / Best Seller / Dashboard in the admin app.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
