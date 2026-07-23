-- =====================================================================
--  SQL Practice Dataset  (PostgreSQL)
-- ---------------------------------------------------------------------
--  Builds the schema used by the 50 practice queries in sql/sql.html and
--  fills it with a LARGE, realistic dataset for learning + query tuning.
--
--  Approx row counts (the "large" preset):
--      departments      10
--      employees     5,000
--      customers   100,000
--      suppliers       500
--      contractors   1,000
--      products      1,000
--      orders    1,000,000
--      order_items ~2.5M
--      accounts         10
--
--  HOW TO RUN
--   psql:           psql -U postgres -d practice -f sample_dataset_postgres.sql
--   SQL Developer:  open this file, pick your PostgreSQL connection, Run Script (F5)
--
--  TO SCALE DOWN: change the generate_series upper bounds marked  <-- SIZE
--  Generating 1M orders + 2.5M items takes ~30-90s on a typical laptop.
-- =====================================================================

-- Optional: make the random data reproducible across runs
SELECT setseed(0.42);

-- ---------------------------------------------------------------------
-- 1) Clean slate
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders       CASCADE;
DROP TABLE IF EXISTS products     CASCADE;
DROP TABLE IF EXISTS contractors  CASCADE;
DROP TABLE IF EXISTS suppliers    CASCADE;
DROP TABLE IF EXISTS customers    CASCADE;
DROP TABLE IF EXISTS employees    CASCADE;
DROP TABLE IF EXISTS departments  CASCADE;
DROP TABLE IF EXISTS accounts     CASCADE;

-- ---------------------------------------------------------------------
-- 2) Schema (primary keys only; FKs + secondary indexes added AFTER load
--    so the bulk insert stays fast — a real ETL practice you should know)
-- ---------------------------------------------------------------------
CREATE TABLE departments (
    id   INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE employees (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name  VARCHAR(50),
    last_name   VARCHAR(50),
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150),
    dept        VARCHAR(50),
    dept_id     INT,
    salary      NUMERIC(10,2),
    hire_date   DATE,
    manager_id  INT,
    active      SMALLINT DEFAULT 1
);

CREATE TABLE customers (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    first_name  VARCHAR(50),
    last_name   VARCHAR(50),
    email       VARCHAR(150),
    phone       VARCHAR(30),
    city        VARCHAR(60),
    country     VARCHAR(40),
    created_at  TIMESTAMP
);

CREATE TABLE suppliers (
    id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(60)
);

CREATE TABLE contractors (
    id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    team VARCHAR(50)
);

CREATE TABLE products (
    id       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name     VARCHAR(120) NOT NULL,
    category VARCHAR(50),
    price    NUMERIC(10,2)
);

CREATE TABLE orders (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INT NOT NULL,
    amount      NUMERIC(12,2),
    status      VARCHAR(20),
    created_at  TIMESTAMP
);

CREATE TABLE order_items (
    id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT,
    price      NUMERIC(10,2)
);

CREATE TABLE accounts (
    id      INT PRIMARY KEY,
    owner   VARCHAR(60),
    balance NUMERIC(12,2)
);

-- ---------------------------------------------------------------------
-- 3) Reference data
-- ---------------------------------------------------------------------
INSERT INTO departments (id, name) VALUES
    (1,'Engineering'),(2,'Sales'),(3,'HR'),(4,'Finance'),(5,'IT'),
    (6,'Marketing'),(7,'Operations'),(8,'Legal'),(9,'Support'),(10,'Product');

INSERT INTO accounts (id, owner, balance) VALUES
    (1,'Alice',1000),(2,'Bob',500),(3,'Carol',2500),(4,'Dave',0),(5,'Eve',9999),
    (6,'Frank',120),(7,'Grace',7600),(8,'Heidi',300),(9,'Ivan',4200),(10,'Judy',88);

-- Helper value arrays (used by random pickers below)
-- first names, last names, cities, countries, product nouns, categories
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 4) Employees (5,000)                                        <-- SIZE
--    managers live in ids 1..500; ~10% have no manager (top of org)
-- ---------------------------------------------------------------------
INSERT INTO employees (first_name, last_name, name, email, dept, dept_id, salary, hire_date, manager_id, active)
SELECT
    fn, ln,
    fn || ' ' || ln,
    lower(fn || '.' || ln || g || '@corp.example.com'),
    dname,
    did,
    round((40000 + random()*90000)::numeric, 2),
    DATE '2015-01-01' + (random()*3650)::int,
    CASE WHEN random() < 0.10 THEN NULL ELSE 1 + floor(random()*500)::int END,
    CASE WHEN random() < 0.92 THEN 1 ELSE 0 END
FROM generate_series(1, 5000) AS g
CROSS JOIN LATERAL (
    SELECT (ARRAY['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda',
                  'David','Elizabeth','Priya','Arjun','Sofia','Liam','Noah','Olivia',
                  'Aarav','Ananya','Wei','Chen','Yuki','Omar','Fatima','Diego'])[1 + floor(random()*24)::int] AS fn,
           (ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
                  'Patel','Sharma','Kumar','Nguyen','Kim','Lee','Khan','Singh',
                  'Rossi','Muller','Silva','Chen','Wang','Lopez','Hassan','Park'])[1 + floor(random()*24)::int] AS ln,
           (1 + floor(random()*10)::int) AS did
) names
CROSS JOIN LATERAL (
    SELECT (ARRAY['Engineering','Sales','HR','Finance','IT',
                  'Marketing','Operations','Legal','Support','Product'])[did] AS dname
) dn;

-- ---------------------------------------------------------------------
-- 5) Customers (100,000)                                      <-- SIZE
-- ---------------------------------------------------------------------
INSERT INTO customers (name, first_name, last_name, email, phone, city, country, created_at)
SELECT
    fn || ' ' || ln,
    fn, ln,
    CASE WHEN random() < 0.95 THEN lower(fn || '.' || ln || g || '@mail.example.com') END,
    CASE WHEN random() < 0.85 THEN '+1-' || (200 + floor(random()*799))::int || '-' || lpad((floor(random()*9999))::int::text, 4, '0') END,
    city,
    country,
    timestamp '2022-01-01' + (random()*1460) * interval '1 day'
FROM generate_series(1, 100000) AS g
CROSS JOIN LATERAL (
    SELECT (ARRAY['Alex','Sam','Jordan','Taylor','Morgan','Casey','Riley','Jamie',
                  'Priya','Arjun','Sofia','Liam','Noah','Olivia','Aarav','Ananya',
                  'Wei','Chen','Yuki','Omar','Fatima','Diego','Emma','Lucas'])[1 + floor(random()*24)::int] AS fn,
           (ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
                  'Patel','Sharma','Kumar','Nguyen','Kim','Lee','Khan','Singh'])[1 + floor(random()*16)::int] AS ln,
           ci, co
    FROM (
        SELECT (ARRAY['New York','London','Mumbai','Berlin','Toronto','Sydney','Pune',
                      'Singapore','Dubai','Paris','Tokyo','Austin'])[idx] AS ci,
               (ARRAY['US','UK','IN','DE','CA','AU','IN',
                      'SG','AE','FR','JP','US'])[idx] AS co
        FROM (SELECT 1 + floor(random()*12)::int AS idx) p
    ) loc
) d;

-- ---------------------------------------------------------------------
-- 6) Suppliers (500) and Contractors (1,000)
-- ---------------------------------------------------------------------
INSERT INTO suppliers (name, city)
SELECT 'Supplier ' || g,
       (ARRAY['New York','London','Mumbai','Berlin','Toronto','Sydney','Pune','Singapore'])[1 + floor(random()*8)::int]
FROM generate_series(1, 500) AS g;

INSERT INTO contractors (name, team)
SELECT 'Contractor ' || g,
       (ARRAY['IT','Sales','Engineering','Support','Ops'])[1 + floor(random()*5)::int]
FROM generate_series(1, 1000) AS g;

-- ---------------------------------------------------------------------
-- 7) Products (1,000)
-- ---------------------------------------------------------------------
INSERT INTO products (name, category, price)
SELECT
    cat || ' ' || noun || ' ' || g,
    cat,
    round((5 + random()*995)::numeric, 2)
FROM generate_series(1, 1000) AS g
CROSS JOIN LATERAL (
    SELECT (ARRAY['Electronics','Books','Home','Toys','Sports','Beauty','Grocery','Office'])[1 + floor(random()*8)::int] AS cat,
           (ARRAY['Pro','Max','Mini','Plus','Lite','Ultra','Classic','Eco'])[1 + floor(random()*8)::int] AS noun
) p;

-- ---------------------------------------------------------------------
-- 8) Orders (1,000,000)                                       <-- SIZE
-- ---------------------------------------------------------------------
INSERT INTO orders (customer_id, amount, status, created_at)
SELECT
    1 + floor(random()*100000)::int,
    round((10 + random()*4990)::numeric, 2),
    (ARRAY['NEW','PAID','SHIPPED','DELIVERED','CANCELLED','VIP'])[1 + floor(random()*6)::int],
    timestamp '2023-01-01' + (random()*1095) * interval '1 day'
FROM generate_series(1, 1000000) AS g;

-- ---------------------------------------------------------------------
-- 9) Order items (1-4 per order  => ~2.5M rows)
-- ---------------------------------------------------------------------
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT
    o.id,
    1 + floor(random()*1000)::int,
    1 + floor(random()*5)::int,
    round((5 + random()*500)::numeric, 2)
FROM orders o
CROSS JOIN LATERAL generate_series(1, 1 + floor(random()*4)::int) AS line;

-- ---------------------------------------------------------------------
-- 10) Constraints + indexes AFTER bulk load (faster, and good practice)
-- ---------------------------------------------------------------------
ALTER TABLE employees   ADD CONSTRAINT fk_emp_dept     FOREIGN KEY (dept_id)     REFERENCES departments(id);
ALTER TABLE employees   ADD CONSTRAINT fk_emp_manager  FOREIGN KEY (manager_id)  REFERENCES employees(id);
ALTER TABLE orders      ADD CONSTRAINT fk_orders_cust  FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE order_items ADD CONSTRAINT fk_oi_order     FOREIGN KEY (order_id)    REFERENCES orders(id);
ALTER TABLE order_items ADD CONSTRAINT fk_oi_product   FOREIGN KEY (product_id)  REFERENCES products(id);

CREATE INDEX idx_emp_dept           ON employees (dept);
CREATE INDEX idx_emp_manager        ON employees (manager_id);
CREATE INDEX idx_customers_city     ON customers (city);
CREATE INDEX idx_orders_customer    ON orders (customer_id);
CREATE INDEX idx_orders_created     ON orders (created_at);
CREATE INDEX idx_orders_status      ON orders (status);
CREATE INDEX idx_orders_cust_date   ON orders (customer_id, created_at);
CREATE INDEX idx_oi_order           ON order_items (order_id);
CREATE INDEX idx_oi_product         ON order_items (product_id);

-- ---------------------------------------------------------------------
-- 11) Refresh planner statistics so EXPLAIN ANALYZE is accurate
-- ---------------------------------------------------------------------
ANALYZE;

-- ---------------------------------------------------------------------
-- 12) Quick sanity check
-- ---------------------------------------------------------------------
SELECT 'departments' AS tbl, count(*) FROM departments
UNION ALL SELECT 'employees',   count(*) FROM employees
UNION ALL SELECT 'customers',   count(*) FROM customers
UNION ALL SELECT 'suppliers',   count(*) FROM suppliers
UNION ALL SELECT 'contractors', count(*) FROM contractors
UNION ALL SELECT 'products',    count(*) FROM products
UNION ALL SELECT 'orders',      count(*) FROM orders
UNION ALL SELECT 'order_items', count(*) FROM order_items
ORDER BY tbl;

-- =====================================================================
--  Try these once loaded:
--   SELECT dept, count(*) FROM employees GROUP BY dept ORDER BY 2 DESC;
--   SELECT c.country, count(*) orders, round(sum(o.amount)) revenue
--     FROM customers c JOIN orders o ON o.customer_id=c.id
--     GROUP BY c.country ORDER BY revenue DESC;
--   EXPLAIN ANALYZE
--     SELECT * FROM orders WHERE customer_id = 12345 ORDER BY created_at DESC;
-- =====================================================================
