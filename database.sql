-- SafeGuide database (XAMPP / phpMyAdmin > Import)
CREATE DATABASE IF NOT EXISTS safeguide_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE safeguide_db;

DROP TABLE IF EXISTS saved_guides, user_checklist, checklist_items, activity_log, hotlines, procedures, guides, users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  steps TEXT NOT NULL,            -- one step per line
  warning VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE procedures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  before_steps TEXT,              -- one step per line
  during_steps TEXT,
  after_steps TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hotlines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emergency_no VARCHAR(30) NOT NULL,
  other_info VARCHAR(100) DEFAULT NULL
);

CREATE TABLE checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL
);

CREATE TABLE user_checklist (
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  checked TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE
);

CREATE TABLE saved_guides (
  user_id INT NOT NULL,
  guide_id INT NOT NULL,
  PRIMARY KEY (user_id, guide_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
);

CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin: username = admin | password = admin123  (palitan pagkatapos mag-login)
INSERT INTO users (full_name, username, email, password, role) VALUES
('Admin User', 'admin', 'admin@safeguide.local', '$2y$12$MxYLuklF7RnQn6hW2JyU5.JWb6qnwR9eS5bCMq95GDxl.lDr.LMqC', 'admin');

INSERT INTO guides (title, category, description, steps, warning) VALUES
('Burns', 'Burns', 'Paso para sa mga paso o sunog sa balat.',
 'Move away from the source of the burn.\nCool the affected area with clean water for at least 10 minutes.\nCover the burn with a clean dressing or sterile cloth.\nSeek professional medical help if necessary.',
 'Do not apply ice, butter, or any home remedies on the burn.'),
('Bleeding', 'Bleeding', 'Pagkontrol ng pagdurugo.',
 'Wash your hands or wear gloves.\nPress firmly on the wound with a clean cloth.\nKeep pressing for at least 10 minutes without lifting.\nRaise the injured area above the heart if possible.\nCall for help if bleeding does not stop.',
 'Do not remove a cloth that is soaked; add another on top.'),
('Choking', 'Choking', 'Kapag nabubulunan ang tao.',
 'Ask "Are you choking?" If they cannot speak or cough, act fast.\nGive 5 firm back blows between the shoulder blades.\nGive 5 abdominal thrusts (Heimlich maneuver).\nRepeat until the object comes out or help arrives.',
 'Call 911 right away if the person becomes unconscious.'),
('Fracture', 'Fracture', 'Putol o bali ng buto.',
 'Keep the person still and calm.\nDo not move the injured part.\nSupport it with a splint or padding.\nApply a cold pack wrapped in cloth.\nGet medical help immediately.',
 'Do not try to straighten the bone.'),
('Fainting', 'Fainting', 'Kapag nawalan ng malay.',
 'Lay the person flat on their back.\nRaise their legs about 12 inches.\nLoosen tight clothing.\nCheck breathing; call 911 if not awake within 1 minute.',
 'Do not give food or drink until fully awake.'),
('Insect Bite', 'Insect Bite', 'Kagat ng insekto.',
 'Move away from the insects.\nRemove the stinger by scraping, not squeezing.\nWash the area with soap and water.\nApply a cold pack to reduce swelling.\nWatch for signs of allergic reaction.',
 'Call 911 if there is trouble breathing or swelling of the face.'),
('Electric Shock', 'Electric Shock', 'Kuryente.',
 'Do not touch the person until the power is off.\nTurn off the power source.\nCall 911.\nCheck breathing and start CPR if needed.',
 'Never use wet or metal objects to move the person.');

INSERT INTO procedures (title, before_steps, during_steps, after_steps) VALUES
('Earthquake',
 'Secure heavy furniture to walls.\nPrepare an emergency kit.\nKnow the safe spots in each room.',
 'Drop, Cover, and Hold On.\nStay away from windows.\nIf outdoors, move to an open area.',
 'Check yourself and others for injuries.\nExpect aftershocks.\nInspect for gas leaks and damage.'),
('Flood',
 'Know your evacuation route.\nMove valuables to higher places.\nCharge phones and power banks.',
 'Move to higher ground.\nDo not walk or drive through floodwater.\nTurn off electricity if safe.',
 'Wait for official clearance before returning.\nDisinfect everything touched by floodwater.'),
('Fire',
 'Install smoke detectors.\nKeep a fire extinguisher at home.\nPlan two exits from every room.',
 'Get out and stay out.\nCrawl low under smoke.\nCall the Fire Department at 911.',
 'Do not re-enter the building.\nGet medical care for burns or smoke inhalation.'),
('Typhoon',
 'Monitor weather bulletins.\nStock food and water for 3 days.\nSecure windows and loose objects.',
 'Stay indoors away from windows.\nKeep radio and flashlight ready.',
 'Avoid fallen power lines.\nBoil water before drinking if supply is affected.'),
('Electrical Emergency',
 'Do not overload outlets.\nReplace damaged cords.',
 'Switch off the main breaker.\nDo not use water on electrical fires.',
 'Have a licensed electrician inspect the system.');

INSERT INTO hotlines (name, emergency_no, other_info) VALUES
('Police', '911', 'Non-Emergency: 117'),
('Fire Department', '911', 'Non-Emergency: 111'),
('Ambulance', '911', 'Non-Emergency: 143'),
('Philippine Red Cross', '143', 'Website: www.redcross.org.ph');

INSERT INTO checklist_items (label) VALUES
('Drinking Water'),('Food'),('Flashlight'),('Batteries'),('First Aid Kit'),
('Important Documents'),('Medicine'),('Power Bank'),('Whistle');

INSERT INTO activity_log (message) VALUES ('System installed');