# MongoDB Docker Access Guide

Complete step-by-step guide to access and explore the MongoDB database running in Docker for the Mindkraft project.

---

## 📋 Table of Contents

1. [Connection Information](#connection-information)
2. [Quick Start](#quick-start)
3. [Step-by-Step Commands](#step-by-step-commands)
4. [Database Overview](#database-overview)
5. [Collection Details](#collection-details)
6. [Useful Queries](#useful-queries)
7. [Backup & Export](#backup--export)
8. [Troubleshooting](#troubleshooting)

---

## Connection Information

### Database Details
- **Container Name**: `mindkraft-mongo-1`
- **Database Name**: `vox`
- **Username**: `voxadmin`
- **Password**: `VoxSecure2026!`
- **Local Port**: `4200`
- **Container Port**: `27017`
- **Authentication Source**: `admin`

### Connection Strings
```
# Docker container
mongodb://voxadmin:VoxSecure2026!@mongo:27017/vox?authSource=admin

# Local (via port 4200)
mongodb://localhost:4200
```

---

## Quick Start

### One-Line Connection
```bash
docker exec -it mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox
```

This connects you to an interactive MongoDB shell where you can run commands.

---

## Step-by-Step Commands

### Step 1️⃣: Verify MongoDB Container is Running
```bash
docker ps | grep mongo
```

Expected output:
```
mindkraft-mongo-1     mongo:7     Running on port 4200
```

---

### Step 2️⃣: Check Docker Networks
```bash
docker network ls
```

Look for `mindkraft-network` or similar.

---

### Step 3️⃣: Connect to MongoDB Container (Interactive Mode)
```bash
docker exec -it mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin
```

Once connected, you'll see:
```
vox>
```

---

### Step 4️⃣: View All Databases
```bash
show dbs
```

Output:
```
admin   40.00 KiB
config  12.00 KiB
local   40.00 KiB
vox     20.00 KiB
```

---

### Step 5️⃣: Switch to Vox Database
```bash
use vox
```

Output:
```
switched to db vox
```

---

### Step 6️⃣: List All Collections
```bash
show collections
```

Output:
```
admins
ai_configurations
answers
audits
exam_autosaves
exams
face_embeddings
face_login_attempts
localExams
responses
students
submissions
```

---

### Step 7️⃣: Count Documents in Each Collection
```bash
db.getCollectionNames().forEach(col => { print(col + ': ' + db[col].countDocuments()) })
```

Output:
```
exams: 2
submissions: 1
exam_autosaves: 2
ai_configurations: 1
localExams: 3
face_login_attempts: 18
face_embeddings: 4
responses: 4
audits: 8
students: 4
admins: 1
answers: 2
```

---

## Database Overview

### Single Command to Get Database Stats
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.getCollectionNames().forEach(col => { print(col + ': ' + db[col].countDocuments()) })"
```

---

## Collection Details

### Students Collection

**View all students:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.students.find().pretty()"
```

**Count total students:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.students.countDocuments()"
```

**Find student by ID:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.students.findOne({studentId: '1036'})"
```

**View limited students (first 2):**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.students.find().limit(2).pretty()"
```

---

### Exams Collection

**View all exams:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.exams.find().pretty()"
```

**View exam by code:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.exams.findOne({code: 'MCQ'})"
```

**Count exams:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.exams.countDocuments()"
```

**View exam questions:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.exams.findOne({code: 'MCQ'}).questions"
```

---

### Submissions Collection

**View all submissions:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.submissions.find().pretty()"
```

**View submission by exam code:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.submissions.findOne({examCode: 'SMOKE_EXAM'})"
```

**View submission by student ID:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.submissions.find({studentId: '1036'}).pretty()"
```

**Count total submissions:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.submissions.countDocuments()"
```

---

### Admins Collection

**View all admins:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.admins.find().pretty()"
```

**View admin by username:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.admins.findOne({username: 'admin'})"
```

---

### Face Embeddings Collection

**View all face embeddings:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.face_embeddings.find().pretty()"
```

**Count face embeddings:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.face_embeddings.countDocuments()"
```

---

### Face Login Attempts Collection

**View login attempts:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.face_login_attempts.find().limit(5).pretty()"
```

**Count attempts:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.face_login_attempts.countDocuments()"
```

---

### Auto-saves Collection

**View all exam auto-saves:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.exam_autosaves.find().pretty()"
```

**View auto-saves for specific student:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.exam_autosaves.find({studentId: '1036'}).pretty()"
```

---

## Useful Queries

### Advanced Queries

**Get students with specific exam code:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.students.find({examCode: 'TECH101'}).pretty()"
```

**Get submissions with status:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.submissions.find({status: 'submitted'}).pretty()"
```

**Get all MCQ type questions:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.exams.find({'questions.type': 'mcq'}).pretty()"
```

**Get answers collection:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.answers.find().pretty()"
```

**Get audit logs:**
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox --eval "db.audits.find().limit(5).pretty()"
```

---

### Formatting Results

**Pretty print (formatted):**
```bash
db.collection.find().pretty()
```

**Limit results:**
```bash
db.collection.find().limit(10)
```

**Skip results (pagination):**
```bash
db.collection.find().skip(5).limit(10)
```

**Sort results:**
```bash
db.collection.find().sort({fieldName: -1})  # -1 for descending, 1 for ascending
```

---

## Backup & Export

### Export Collection to JSON

**Export students collection:**
```bash
docker exec mindkraft-mongo-1 mongoexport --username voxadmin --password VoxSecure2026! --authenticationDatabase admin --db vox --collection students --out students.json
```

**Export all collections:**
```bash
docker exec mindkraft-mongo-1 mongodump --username voxadmin --password VoxSecure2026! --authenticationDatabase admin --db vox --out /tmp/vox_backup
```

---

### View Exported Data

After export, copy from container:
```bash
docker cp mindkraft-mongo-1:/tmp/vox_backup ./vox_backup
```

---

## Troubleshooting

### Issue: "Command requires authentication"

**Solution:** Always include credentials:
```bash
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox
```

---

### Issue: Container not found

**Solution:** Check running containers:
```bash
docker ps -a
```

And ensure MongoDB container is running:
```bash
docker-compose up -d mongo
```

---

### Issue: Connection timeout

**Solution:** Verify port forwarding:
```bash
docker logs mindkraft-mongo-1
```

Check if port 4200 is accessible:
```bash
netstat -an | findstr 4200
```

---

### Issue: Access Denied

**Solution:** Verify credentials and database:
```bash
# Correct syntax:
docker exec mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox
```

---

## Common Workflow

### Complete Data Investigation Flow

**1. Connect to MongoDB:**
```bash
docker exec -it mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox
```

**2. View collections:**
```
show collections
```

**3. Count all documents:**
```
db.getCollectionNames().forEach(col => { print(col + ': ' + db[col].countDocuments()) })
```

**4. Explore students:**
```
db.students.find().pretty()
```

**5. Explore exams:**
```
db.exams.find().pretty()
```

**6. View submissions:**
```
db.submissions.find().pretty()
```

**7. Exit shell:**
```
.exit
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Connect to DB | `docker exec -it mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox` |
| List collections | `db.getCollectionNames()` |
| Count documents | `db.collection.countDocuments()` |
| Find all | `db.collection.find().pretty()` |
| Find by ID | `db.collection.findOne({_id: ObjectId('...')})` |
| Find by field | `db.collection.find({fieldName: value}).pretty()` |
| Limit results | `db.collection.find().limit(10)` |
| Sort ascending | `db.collection.find().sort({field: 1})` |
| Sort descending | `db.collection.find().sort({field: -1})` |
| Insert document | `db.collection.insertOne({field: value})` |
| Update document | `db.collection.updateOne({_id: ...}, {$set: {...}})` |
| Delete document | `db.collection.deleteOne({_id: ...})` |

---

## Environment Configuration

The MongoDB configuration is defined in `docker-compose.yml`:

```yaml
mongo:
  image: mongo:7
  ports:
    - "127.0.0.1:4200:27017"
  environment:
    MONGO_INITDB_DATABASE: vox
    MONGO_INITDB_ROOT_USERNAME: voxadmin
    MONGO_INITDB_ROOT_PASSWORD: VoxSecure2026!
  volumes:
    - mongo-data:/data/db
    - mongo-config:/data/configdb
```

---

## Notes

- **Password**: `VoxSecure2026!` (change this in production)
- **All data persists** in `mongo-data` volume
- **Connection timeout**: If experiencing issues, restart container: `docker restart mindkraft-mongo-1`
- **Performance**: For large datasets, always use `.limit()` in queries

---

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongosh Documentation](https://docs.mongodb.com/mongodb-shell/)
- [MongoDB Queries](https://docs.mongodb.com/manual/tutorial/query-documents/)
