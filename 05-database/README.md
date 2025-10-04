# 🗄️ Database

Database schemas, models, and migration scripts for the Nomu Cafe management system.

## 📁 Database Structure

```
05-database/
├── schemas/              # Database schemas and models
├── migrations/           # Database migration scripts
├── seeds/               # Sample data and test data
├── backups/             # Database backup scripts
└── README.md           # This file
```

## 🗄️ Database Information

- **Type**: MongoDB (NoSQL)
- **Hosting**: MongoDB Atlas (Cloud)
- **Collections**: 12 main collections
- **Indexes**: Optimized for performance
- **Backup**: Automated daily backups

## 📊 Collections Overview

### User Management
- `users` - Customer accounts
- `admins` - Staff and admin accounts
- `temp_signups` - Temporary signup data

### Authentication
- `otps` - OTP verification codes
- `failed_attempts` - Security tracking

### Business Data
- `menu_items` - Menu products
- `inventory_items` - Stock management
- `stock_movements` - Inventory tracking
- `promos` - Promotional campaigns
- `rewards` - Loyalty rewards

### Operations
- `feedback` - Customer feedback
- `admin_activities` - Admin action logs

## 🔧 Schema Files

### User Schema
```javascript
{
  fullName: String,
  username: String,
  email: String,
  password: String,
  birthday: Date,
  gender: String,
  role: String,
  pastOrders: [Object],
  loyaltyPoints: Number,
  // ... other fields
}
```

### Menu Item Schema
```javascript
{
  name: String,
  category: String,
  price: Number,
  description: String,
  image: String,
  availability: Boolean,
  // ... other fields
}
```

## 🚀 Migration Scripts

### Available Migrations
- User data migration
- Menu item updates
- Inventory system migration
- Order data restructuring

### Running Migrations
```bash
# Run all migrations
node migrations/run-all.js

# Run specific migration
node migrations/migrate-orders.js
```

## 🌱 Seed Data

### Sample Data
- Test users (customers and admins)
- Sample menu items
- Inventory data
- Promotional campaigns

### Loading Seed Data
```bash
# Load all seed data
node seeds/load-all.js

# Load specific data
node seeds/load-menu.js
```

## 🔐 Security

### Data Protection
- Encrypted sensitive fields
- Secure password hashing
- Input validation
- Access control

### Backup Strategy
- Daily automated backups
- Point-in-time recovery
- Cross-region replication
- Retention policies

## 📈 Performance

### Indexes
- User email and username
- Menu item categories
- Order timestamps
- Inventory tracking

### Optimization
- Query optimization
- Connection pooling
- Caching strategies
- Monitoring

## 🚀 Setup Instructions

### Development
1. Set up MongoDB Atlas account
2. Create database cluster
3. Configure connection string
4. Run migration scripts
5. Load seed data

### Production
1. Configure production cluster
2. Set up monitoring
3. Configure backups
4. Implement security measures
5. Performance tuning

## 📊 Monitoring

### Metrics Tracked
- Database performance
- Query execution times
- Connection usage
- Storage utilization
- Error rates

### Tools Used
- MongoDB Atlas monitoring
- Custom performance scripts
- Alert configurations
- Regular health checks

## 🔄 Maintenance

### Regular Tasks
- Index optimization
- Data cleanup
- Performance monitoring
- Security updates
- Backup verification

### Troubleshooting
- Common issues guide
- Performance tuning
- Error resolution
- Recovery procedures

---

**Database Version**: 1.0  
**Last Updated**: December 2024  
**Maintainer**: Development Team
