"""Generate 50 basic SQL query cards for sql.html."""

QUERIES = [
    ("bq-01", "SELECT all rows from a table", "SELECT", "SELECT * FROM employees;"),
    ("bq-02", "SELECT specific columns", "SELECT", "SELECT id, name, dept, salary FROM employees;"),
    ("bq-03", "SELECT DISTINCT values", "SELECT", "SELECT DISTINCT dept FROM employees;"),
    ("bq-04", "WHERE — filter by equality", "WHERE", "SELECT * FROM employees WHERE dept = 'Engineering';"),
    ("bq-05", "WHERE — AND / OR conditions", "WHERE",
     "SELECT * FROM employees\nWHERE dept = 'Sales' AND salary > 50000\n   OR (dept = 'HR' AND active = 1);"),
    ("bq-06", "WHERE — IN list", "WHERE", "SELECT * FROM employees WHERE dept IN ('HR', 'Finance', 'IT');"),
    ("bq-07", "WHERE — BETWEEN range", "WHERE",
     "SELECT * FROM orders\nWHERE created_at BETWEEN '2025-01-01' AND '2025-01-31';"),
    ("bq-08", "WHERE — LIKE pattern match", "WHERE", "SELECT * FROM customers WHERE name LIKE 'A%';"),
    ("bq-09", "WHERE — IS NULL / IS NOT NULL", "WHERE",
     "SELECT * FROM employees WHERE manager_id IS NULL;\nSELECT * FROM employees WHERE email IS NOT NULL;"),
    ("bq-10", "ORDER BY ascending", "ORDER BY", "SELECT * FROM employees ORDER BY hire_date ASC;"),
    ("bq-11", "ORDER BY descending (multiple columns)", "ORDER BY",
     "SELECT * FROM employees ORDER BY dept ASC, salary DESC;"),
    ("bq-12", "LIMIT and OFFSET (pagination)", "LIMIT",
     "SELECT * FROM orders ORDER BY id LIMIT 10 OFFSET 20;\n-- MySQL: LIMIT offset, count → LIMIT 20, 10"),
    ("bq-13", "COUNT rows", "Aggregate", "SELECT COUNT(*) AS total_employees FROM employees;"),
    ("bq-14", "SUM — total amount", "Aggregate", "SELECT SUM(amount) AS total_revenue FROM orders;"),
    ("bq-15", "AVG — average salary", "Aggregate", "SELECT AVG(salary) AS avg_salary FROM employees;"),
    ("bq-16", "MIN and MAX", "Aggregate",
     "SELECT MIN(salary) AS min_sal, MAX(salary) AS max_sal FROM employees;"),
    ("bq-17", "GROUP BY — count per department", "GROUP BY",
     "SELECT dept, COUNT(*) AS headcount\nFROM employees\nGROUP BY dept;"),
    ("bq-18", "HAVING — filter grouped results", "HAVING",
     "SELECT dept, AVG(salary) AS avg_sal\nFROM employees\nGROUP BY dept\nHAVING AVG(salary) > 60000;"),
    ("bq-19", "INNER JOIN — employees and departments", "JOIN",
     "SELECT e.name, d.name AS dept_name\nFROM employees e\nINNER JOIN departments d ON e.dept_id = d.id;"),
    ("bq-20", "LEFT JOIN — all customers, even without orders", "JOIN",
     "SELECT c.name, o.id AS order_id\nFROM customers c\nLEFT JOIN orders o ON c.id = o.customer_id;"),
    ("bq-21", "RIGHT JOIN — all orders with customer info", "JOIN",
     "SELECT c.name, o.amount\nFROM customers c\nRIGHT JOIN orders o ON c.id = o.customer_id;"),
    ("bq-22", "JOIN three tables", "JOIN",
     "SELECT c.name, o.id, p.name AS product\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nJOIN order_items oi ON o.id = oi.order_id\nJOIN products p ON oi.product_id = p.id;"),
    ("bq-23", "Self JOIN — employee and manager names", "JOIN",
     "SELECT e.name AS employee, m.name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.id;"),
    ("bq-24", "CROSS JOIN — every combination", "JOIN",
     "SELECT e.name, d.name AS dept\nFROM employees e\nCROSS JOIN departments d;"),
    ("bq-25", "UNION — combine two result sets (dedupe)", "Set ops",
     "SELECT name FROM employees WHERE dept = 'IT'\nUNION\nSELECT name FROM contractors WHERE team = 'IT';"),
    ("bq-26", "UNION ALL — keep duplicates", "Set ops",
     "SELECT city FROM customers\nUNION ALL\nSELECT city FROM suppliers;"),
    ("bq-27", "Scalar subquery in SELECT", "Subquery",
     "SELECT name, salary,\n  (SELECT AVG(salary) FROM employees) AS company_avg\nFROM employees;"),
    ("bq-28", "Subquery with IN", "Subquery",
     "SELECT name FROM customers\nWHERE id IN (SELECT customer_id FROM orders WHERE amount > 1000);"),
    ("bq-29", "EXISTS — customers who placed orders", "Subquery",
     "SELECT name FROM customers c\nWHERE EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n);"),
    ("bq-30", "NOT EXISTS — customers with no orders", "Subquery",
     "SELECT name FROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o WHERE o.customer_id = c.id\n);"),
    ("bq-31", "INSERT — single row", "DML",
     "INSERT INTO employees (name, dept, salary)\nVALUES ('Alice', 'Engineering', 75000);"),
    ("bq-32", "INSERT — multiple rows", "DML",
     "INSERT INTO employees (name, dept, salary) VALUES\n  ('Bob', 'Sales', 55000),\n  ('Carol', 'HR', 48000);"),
    ("bq-33", "UPDATE — change salary", "DML",
     "UPDATE employees SET salary = salary * 1.05 WHERE dept = 'Engineering';"),
    ("bq-34", "UPDATE with JOIN (MySQL)", "DML",
     "UPDATE orders o\nJOIN customers c ON o.customer_id = c.id\nSET o.status = 'VIP'\nWHERE c.country = 'DE';"),
    ("bq-35", "DELETE — remove old rows", "DML", "DELETE FROM orders WHERE status = 'CANCELLED' AND created_at < '2024-01-01';"),
    ("bq-36", "CREATE TABLE", "DDL",
     "CREATE TABLE employees (\n  id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(100) NOT NULL,\n  dept VARCHAR(50),\n  salary DECIMAL(10,2),\n  hire_date DATE\n);"),
    ("bq-37", "ALTER TABLE — add column", "DDL", "ALTER TABLE employees ADD COLUMN email VARCHAR(150) AFTER name;"),
    ("bq-38", "DROP TABLE", "DDL", "DROP TABLE IF EXISTS temp_import_staging;"),
    ("bq-39", "CREATE INDEX", "DDL", "CREATE INDEX idx_emp_dept ON employees (dept);"),
    ("bq-40", "Composite index", "DDL", "CREATE INDEX idx_orders_cust_date ON orders (customer_id, created_at);"),
    ("bq-41", "FOREIGN KEY constraint", "DDL",
     "ALTER TABLE orders\nADD CONSTRAINT fk_orders_customer\nFOREIGN KEY (customer_id) REFERENCES customers(id);"),
    ("bq-42", "CASE WHEN — salary band label", "Functions",
     "SELECT name, salary,\n  CASE\n    WHEN salary >= 80000 THEN 'Senior'\n    WHEN salary >= 50000 THEN 'Mid'\n    ELSE 'Junior'\n  END AS band\nFROM employees;"),
    ("bq-43", "COALESCE / IFNULL — default value", "Functions",
     "SELECT name, COALESCE(phone, 'N/A') AS phone FROM customers;"),
    ("bq-44", "Date functions — filter and format", "Functions",
     "SELECT * FROM orders WHERE YEAR(created_at) = 2025;\nSELECT DATE_FORMAT(hire_date, '%Y-%m') AS hire_month FROM employees;"),
    ("bq-45", "CONCAT — full name", "Functions", "SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM employees;"),
    ("bq-46", "UPPER, LOWER, TRIM", "Functions",
     "SELECT UPPER(dept), LOWER(email), TRIM(name) FROM employees;"),
    ("bq-47", "ROW_NUMBER — rank employees by salary per dept", "Window",
     "SELECT name, dept, salary,\n  ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\nFROM employees;"),
    ("bq-48", "RANK and DENSE_RANK", "Window",
     "SELECT name, salary,\n  RANK() OVER (ORDER BY salary DESC) AS rnk,\n  DENSE_RANK() OVER (ORDER BY salary DESC) AS drnk\nFROM employees;"),
    ("bq-49", "CTE (WITH clause)", "CTE",
     "WITH dept_avg AS (\n  SELECT dept, AVG(salary) AS avg_sal FROM employees GROUP BY dept\n)\nSELECT e.name, e.salary, d.avg_sal\nFROM employees e\nJOIN dept_avg d ON e.dept = d.dept\nWHERE e.salary > d.avg_sal;"),
    ("bq-50", "Transaction — BEGIN, COMMIT, ROLLBACK", "Transaction",
     "START TRANSACTION;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nCOMMIT;\n-- On error: ROLLBACK;"),
]

def card(qid, title, tag, sql):
    return f"""        <article class="qa-card" data-id="{qid}" data-level="easy" data-section="basic-queries">
          <div class="qa-question"><h3>{title}</h3>
            <div class="qa-meta"><span class="level level-easy">Easy</span><span class="tag">{tag}</span><span class="chevron">▼</span></div></div>
          <div class="qa-answer">
            <pre><code>{sql}</code></pre>
            <div class="qa-footer"><label><input type="checkbox" class="mark-practiced"> Mark practiced</label></div>
          </div>
        </article>
"""

if __name__ == "__main__":
    import pathlib
    out = pathlib.Path(__file__).with_name("basic_queries_fragment.html")
    out.write_text("".join(card(*q) for q in QUERIES), encoding="utf-8")
    print(f"Wrote {len(QUERIES)} cards to {out}")
