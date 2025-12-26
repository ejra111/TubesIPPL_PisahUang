-- Tabel untuk menyimpan data user
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(128) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL
);

-- Tabel untuk menyimpan data bill
CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  title VARCHAR(128) NOT NULL,
  tip_percent DECIMAL(10,2) NULL,
  tip_amount DECIMAL(10,2) NULL,
  tax_percent DECIMAL(10,2) NULL,
  tax_amount DECIMAL(10,2) NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Tabel untuk menyimpan peserta dalam bill
CREATE TABLE IF NOT EXISTS participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Tabel untuk menyimpan item dalam bill
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Tabel untuk menyimpan pembagian item per peserta
CREATE TABLE IF NOT EXISTS item_splits (
  item_id INT NOT NULL,
  participant_id INT NOT NULL,
  weight DECIMAL(10,4) NOT NULL,
  PRIMARY KEY (item_id, participant_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

-- Tabel untuk menyimpan link share bill
CREATE TABLE IF NOT EXISTS share_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

