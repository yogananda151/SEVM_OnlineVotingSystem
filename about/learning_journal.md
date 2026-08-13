# 📓 Learning Journal — Smart EVM Online Voting System

> **Student Learning Reflection Document**
> Project: Online Voting System (DBMS Project)
> Technology: MySQL · Node.js · React · Prisma ORM

---

## 📌 Project Overview

This project is a full-stack simulation of a real Electronic Voting Machine (EVM) system. It was built to demonstrate database management concepts, web application development, and secure system design using modern technologies.

---

## 🗓️ Week-by-Week Learning Log

---

### Week 1 — Database Design & Schema

**What I worked on:**
- Designed the full database schema for the voting system
- Identified all 16 tables needed: users, elections, constituencies, polling_stations, candidates, voters, votes, etc.
- Wrote the complete MySQL `CREATE TABLE` statements

**Key Concepts Learned:**

#### 1. Entity Relationship (ER) Modelling
- An **entity** is a real-world object (e.g., Voter, Candidate, Election)
- A **relationship** defines how entities are connected (e.g., a Voter *belongs to* a Constituency)
- I learned how to convert real-world requirements into ER diagrams before writing SQL

#### 2. Primary Keys and Foreign Keys
```sql
-- Primary Key: uniquely identifies each row
id INT NOT NULL AUTO_INCREMENT PRIMARY KEY

-- Foreign Key: links two tables together
CONSTRAINT voters_constituencyId_fkey
    FOREIGN KEY (constituencyId)
    REFERENCES constituencies(id)
    ON DELETE CASCADE
```
- **Primary Key (PK):** Every table needs one unique identifier per row
- **Foreign Key (FK):** Creates a link between two tables and enforces referential integrity

#### 3. Referential Integrity — CASCADE vs RESTRICT vs SET NULL
| Rule | Meaning | Used Where |
|------|---------|-----------|
| `ON DELETE CASCADE` | Delete child rows when parent is deleted | Delete election → delete its constituencies |
| `ON DELETE RESTRICT` | Block deletion if child rows exist | Can't delete a voter who has already voted |
| `ON DELETE SET NULL` | Set FK to NULL when parent is deleted | Officer can remain even if station is deleted |

**Why this matters:** These rules protect our data from becoming inconsistent (e.g., a vote pointing to a deleted voter).

#### 4. ENUM Data Type
```sql
status ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'CLOSED', 'RESULTS_PUBLISHED')
```
- `ENUM` restricts a column to a predefined list of values
- More efficient than storing strings, prevents invalid data entry

#### 5. Soft Delete Pattern
- Instead of permanently deleting records, we use a `deletedAt DATETIME NULL` column
- When `deletedAt IS NOT NULL`, the record is considered "deleted"
- **Benefit:** Maintains a complete history for auditing and recovery

**Challenges Faced:**
- Initially confused about when to use CASCADE vs RESTRICT — learned by thinking about "what happens to related data when I delete a record?"
- Figuring out the correct table creation ORDER matters because of foreign key dependencies (you can't reference a table that doesn't exist yet)

---

### Week 2 — Normalization & Indexing

**What I worked on:**
- Applied database normalization rules to remove data redundancy
- Added indexes to improve query performance

#### 6. Database Normalization

**1st Normal Form (1NF):**
- Every column must contain atomic (indivisible) values
- Example: We store `fullName` as one field, not combined name+address

**2nd Normal Form (2NF):**
- All non-key columns must depend on the *entire* primary key
- Example: `candidates` table — `fullName` depends on `id` alone, not on `constituencyId`

**3rd Normal Form (3NF):**
- No transitive dependencies (non-key column depending on another non-key column)
- Example: We store `partyName` in `digital_vvpat` even though it could be looked up via `candidateId → party` — this is an intentional denormalization for audit records (VVPAT must be immutable)

#### 7. Indexes

```sql
-- Speed up queries that filter by email
INDEX users_email_idx (email)

-- Speed up queries that filter by both columns together
INDEX votes_castAt_idx (castAt)
```

- An index is like a book's index — it lets MySQL find rows faster without scanning every row
- **Trade-off:** Indexes speed up `SELECT` but slightly slow down `INSERT`/`UPDATE`
- **When to index:** Columns used in `WHERE`, `JOIN`, or `ORDER BY` clauses

#### 8. Unique Constraints
```sql
-- Ensures no two voters can have the same Voter ID
UNIQUE KEY voters_voterId_key (voterId)

-- Composite unique: same code can exist in different elections, but not in the same one
UNIQUE KEY constituencies_electionId_code_key (electionId, code)
```

**Challenge:** Understanding *composite unique keys* — a combination of columns must be unique together, not individually.

---

### Week 3 — Backend API Development (Node.js + Express)

**What I worked on:**
- Built the REST API using Node.js and Express
- Implemented JWT authentication
- Used Prisma ORM to interact with the MySQL database

#### 9. What is an ORM?
**ORM = Object Relational Mapper**
- Instead of writing raw SQL, you write JavaScript/TypeScript code and the ORM translates it to SQL
- **Prisma** is the ORM used in this project

```typescript
// Without ORM (raw SQL):
"SELECT * FROM voters WHERE id = 5"

// With Prisma ORM:
await prisma.voter.findUnique({ where: { id: 5 } })
```

#### 10. Prisma Schema → MySQL Tables
- We define tables in `schema.prisma` using a clean syntax
- Run `npx prisma migrate dev` → Prisma auto-generates the SQL and runs it
- This ensures the database structure always matches the code

#### 11. REST API Design
| HTTP Method | Purpose | Example |
|-------------|---------|---------|
| `GET` | Read data | `GET /api/voters` — get all voters |
| `POST` | Create data | `POST /api/elections` — create election |
| `PUT` | Update data | `PUT /api/candidates/5` — update candidate |
| `PATCH` | Partial update | `PATCH /api/polling-stations/1/machine-status` |
| `DELETE` | Delete data | `DELETE /api/voters/10` |

#### 12. JWT Authentication
```
User logs in → Server generates a JWT token → 
Client stores token → Sends token with every request → 
Server verifies token → Grants or denies access
```
- **JWT = JSON Web Token** — a secure way to prove who you are
- Token has 3 parts: Header, Payload (user data), Signature
- Our token expires in 8 hours for security

#### 13. Database Transactions
The most critical concept for voting integrity:
```typescript
// Cast vote inside a transaction — ALL or NOTHING
await prisma.$transaction(async (tx) => {
    const vote = await tx.vote.create({ ... });      // Step 1: Record vote
    await tx.digitalVVPAT.create({ ... });           // Step 2: Create VVPAT
    await tx.voter.update({ hasVoted: true });        // Step 3: Mark voter
    // If ANY step fails → ALL steps are rolled back
});
```
- A **transaction** ensures that related operations either ALL succeed or ALL fail
- This prevents a voter being marked as "voted" if the vote record fails to save

**Challenge:** Understanding why transactions are critical — without them, a system crash mid-vote could mark a voter as "voted" but not actually record the vote.

---

### Week 4 — Frontend Development (React)

**What I worked on:**
- Built the user interface using React and TypeScript
- Created three separate interfaces: Commissioner, Officer, and Voting Machine

#### 14. React Component Architecture
- A **component** is a reusable piece of UI (like a Button, Table, or Modal)
- We structured components by: `pages/` (full pages) and `components/ui/` (reusable small pieces)

#### 15. State Management with Hooks
```typescript
const [screen, setScreen] = useState('welcome'); // tracks which screen to show
const [voter, setVoter] = useState(null);         // stores verified voter data
```
- `useState` lets a component "remember" information
- When state changes, React automatically re-renders the component

#### 16. API Communication (Axios)
```typescript
// Frontend asks backend for data
const response = await axios.get('/api/elections');
const elections = response.data;
```
- The frontend and backend communicate over HTTP
- We use **Axios** to make HTTP requests from React to the Express server

---

### Week 5 — Security Implementation

**What I worked on:**
- Implemented password hashing, vote hashing, and access control

#### 17. Password Hashing (bcrypt)
```
Plain password: "Admin@12345"
After bcrypt:   "$2b$12$xK9p7qR3mN2..."  ← stored in database
```
- **Never** store plain-text passwords in a database
- `bcrypt` is a one-way hashing function — you can verify a password but never "decode" the hash
- We use 12 rounds (the higher the rounds, the slower and more secure)

#### 18. SHA-256 Vote Hashing
```
Vote data: "voterId:5|candidateId:3|timestamp:2025-01-01T10:30:00"
SHA-256 Hash: "a3f7e2b9c1d4..." (64 characters, always unique)
```
- Every vote gets a unique SHA-256 cryptographic hash
- This hash is stored in both `votes` and `digital_vvpat` tables
- It proves the vote was not tampered with after it was cast

#### 19. Role-Based Access Control (RBAC)
| Role | Can Do |
|------|--------|
| COMMISSIONER | Everything — manage elections, view all data |
| OFFICER | Manage their station only — start/pause voting |
| Voter | Only use the voting machine interface |

---

## 🧠 Key DBMS Concepts Summary

| Concept | Definition | Where Used in Project |
|---------|-----------|----------------------|
| **Primary Key** | Unique identifier for each row | Every table (`id`) |
| **Foreign Key** | Links two tables, enforces referential integrity | 14 FK relationships |
| **Normalization** | Removing data redundancy | All tables follow 3NF |
| **Index** | Data structure that speeds up queries | 25+ indexes across all tables |
| **Transaction** | Group of operations that all succeed or all fail | Vote casting |
| **ENUM** | Column restricted to a set of allowed values | status, role, machineStatus |
| **Cascade** | Automatically apply changes to related rows | Delete election → delete constituencies |
| **Unique Constraint** | Prevents duplicate values in a column | Voter ID, Vote hash, Email |
| **Soft Delete** | Mark records as deleted without removing them | Users, Voters, Elections |
| **Stored Hash** | One-way encrypted representation of data | Passwords, Vote hashes |
| **Composite Key** | Unique constraint on multiple columns | (electionId + code) |
| **NULL vs NOT NULL** | Whether a column can be empty | Optional fields (phone, photoUrl) |

---

## 🔍 Interesting Problems & Solutions

### Problem 1: How to ensure one voter votes only once?
**Solution:** Add `UNIQUE KEY votes_voterId_key (voterId)` on the `votes` table. MySQL will throw an error if you try to insert a second vote for the same voter.

### Problem 2: How to make results invisible until officially published?
**Solution:** Added `isResultPublished BOOLEAN DEFAULT FALSE` on the `elections` table. The API only returns results when this flag is `TRUE`.

### Problem 3: How to prevent vote tampering?
**Solution:** SHA-256 hash of vote data is stored at the moment of casting. Any tampering would change the hash, making it detectable.

### Problem 4: How to handle a system crash during vote casting?
**Solution:** Use database transactions. If the system crashes after writing the vote but before marking the voter as "voted", the entire transaction is rolled back and the voter can try again.

---

## 📊 Database Statistics

| Metric | Count |
|--------|-------|
| Total Tables | 16 |
| Total Foreign Keys | 14 |
| Total Indexes | 27+ |
| ENUM columns | 6 |
| Tables with Soft Delete | 8 |
| Tables with Unique Constraints | 10 |

---

## 🚀 Technologies Used

| Technology | Purpose | What I Learned |
|-----------|---------|---------------|
| **MySQL 9.7** | Database engine | SQL, relational design, constraints |
| **Prisma ORM** | Database access layer | Schema-first development, migrations |
| **Node.js + Express** | Backend API server | REST API design, middleware |
| **TypeScript** | Type-safe JavaScript | Static typing, interfaces |
| **React** | Frontend UI library | Components, hooks, state management |
| **JWT** | Authentication tokens | Stateless auth, token expiry |
| **bcrypt** | Password hashing | Cryptographic security |
| **SHA-256** | Vote integrity hashing | Data verification |
| **Tailwind CSS** | Styling | Utility-first CSS |

---

## 💡 Key Takeaways

1. **Schema design is the most important step.** A well-designed database makes everything else easier.
2. **Foreign keys are not optional.** Without them, data can become inconsistent (orphaned records).
3. **Always use transactions for multi-step operations.** Especially when data integrity is critical.
4. **Never store plain-text passwords.** Always hash with a strong algorithm like bcrypt.
5. **Indexes are a trade-off.** They speed up reads but slow down writes — use them wisely.
6. **Normalization prevents bugs.** Storing the same data in multiple places leads to inconsistencies.
7. **Soft deletes preserve history.** Especially important in audit-sensitive systems like voting.
8. **Security is built-in, not bolted on.** Design security from the start, not as an afterthought.

---

## 📝 Reflection

Building this project taught me that database management is not just about storing data — it is about **ensuring data integrity, consistency, and security** at every level. The voting system in particular is an excellent example because the consequences of data errors are severe (a wrongly recorded vote, a corrupted result).

The most valuable lesson was understanding **why** each design decision exists. Every constraint, every foreign key, every index has a reason. Learning to ask "what could go wrong if this constraint didn't exist?" was the most important skill I developed.

---

*Learning Journal — DBMS Project — Online Voting System*
*Submitted as part of Database Management Systems coursework*
