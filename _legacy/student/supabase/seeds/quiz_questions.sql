-- ============================================
-- QUIZ QUESTIONS SEED DATA
-- Sample questions for demo assessments
-- ============================================

-- Update assessments with time limits and instructions
UPDATE assessments SET
  time_limit_minutes = 30,
  max_attempts = 2,
  instructions = 'Read each question carefully. You can navigate between questions before submitting. Your progress is saved automatically.'
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE assessments SET
  time_limit_minutes = 20,
  max_attempts = 2,
  instructions = 'This quiz tests your understanding of arrays and linked lists. Choose the best answer for each question.'
WHERE id = 'a2222222-2222-2222-2222-222222222221';

-- ============================================
-- QUESTIONS FOR HTML FUNDAMENTALS QUIZ
-- Assessment ID: a1111111-1111-1111-1111-111111111111
-- ============================================

-- Question 1: Multiple Choice
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111101',
  'a1111111-1111-1111-1111-111111111111',
  'What does HTML stand for?',
  'multiple_choice',
  5,
  'HTML stands for HyperText Markup Language. It is the standard markup language for creating web pages.',
  1
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o1111111-1111-1111-1111-111111111101', 'q1111111-1111-1111-1111-111111111101', 'Hyper Text Markup Language', true, 1),
('o1111111-1111-1111-1111-111111111102', 'q1111111-1111-1111-1111-111111111101', 'High Tech Modern Language', false, 2),
('o1111111-1111-1111-1111-111111111103', 'q1111111-1111-1111-1111-111111111101', 'Hyper Transfer Markup Language', false, 3),
('o1111111-1111-1111-1111-111111111104', 'q1111111-1111-1111-1111-111111111101', 'Home Tool Markup Language', false, 4);

-- Question 2: Multiple Choice
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111102',
  'a1111111-1111-1111-1111-111111111111',
  'Which HTML tag is used to define the largest heading?',
  'multiple_choice',
  5,
  'The <h1> tag defines the largest heading. HTML headings range from <h1> (largest) to <h6> (smallest).',
  2
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o1111111-1111-1111-1111-111111111201', 'q1111111-1111-1111-1111-111111111102', '<h1>', true, 1),
('o1111111-1111-1111-1111-111111111202', 'q1111111-1111-1111-1111-111111111102', '<heading>', false, 2),
('o1111111-1111-1111-1111-111111111203', 'q1111111-1111-1111-1111-111111111102', '<h6>', false, 3),
('o1111111-1111-1111-1111-111111111204', 'q1111111-1111-1111-1111-111111111102', '<head>', false, 4);

-- Question 3: Multiple Choice
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111103',
  'a1111111-1111-1111-1111-111111111111',
  'Which HTML attribute is used to define inline styles?',
  'multiple_choice',
  5,
  'The style attribute is used to add inline CSS styles directly to an HTML element.',
  3
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o1111111-1111-1111-1111-111111111301', 'q1111111-1111-1111-1111-111111111103', 'style', true, 1),
('o1111111-1111-1111-1111-111111111302', 'q1111111-1111-1111-1111-111111111103', 'class', false, 2),
('o1111111-1111-1111-1111-111111111303', 'q1111111-1111-1111-1111-111111111103', 'font', false, 3),
('o1111111-1111-1111-1111-111111111304', 'q1111111-1111-1111-1111-111111111103', 'css', false, 4);

-- Question 4: True/False
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111104',
  'a1111111-1111-1111-1111-111111111111',
  'HTML tags are case-sensitive.',
  'true_false',
  5,
  'false',
  'HTML tags are NOT case-sensitive. <P> and <p> are treated the same. However, it is best practice to use lowercase tags.',
  4
);

-- Question 5: Multiple Choice
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111105',
  'a1111111-1111-1111-1111-111111111111',
  'Which tag is used to create a hyperlink in HTML?',
  'multiple_choice',
  5,
  'The <a> (anchor) tag is used to create hyperlinks. The href attribute specifies the URL.',
  5
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o1111111-1111-1111-1111-111111111501', 'q1111111-1111-1111-1111-111111111105', '<a>', true, 1),
('o1111111-1111-1111-1111-111111111502', 'q1111111-1111-1111-1111-111111111105', '<link>', false, 2),
('o1111111-1111-1111-1111-111111111503', 'q1111111-1111-1111-1111-111111111105', '<href>', false, 3),
('o1111111-1111-1111-1111-111111111504', 'q1111111-1111-1111-1111-111111111105', '<url>', false, 4);

-- Question 6: Multiple Choice
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111106',
  'a1111111-1111-1111-1111-111111111111',
  'Which HTML element is used to define important text?',
  'multiple_choice',
  5,
  'The <strong> tag defines important text and typically displays it in bold.',
  6
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o1111111-1111-1111-1111-111111111601', 'q1111111-1111-1111-1111-111111111106', '<strong>', true, 1),
('o1111111-1111-1111-1111-111111111602', 'q1111111-1111-1111-1111-111111111106', '<b>', false, 2),
('o1111111-1111-1111-1111-111111111603', 'q1111111-1111-1111-1111-111111111106', '<important>', false, 3),
('o1111111-1111-1111-1111-111111111604', 'q1111111-1111-1111-1111-111111111106', '<em>', false, 4);

-- Question 7: True/False
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111107',
  'a1111111-1111-1111-1111-111111111111',
  'The <img> tag in HTML requires a closing tag.',
  'true_false',
  5,
  'false',
  'The <img> tag is a self-closing (void) element and does not require a closing tag.',
  7
);

-- Question 8: Multiple Choice
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111108',
  'a1111111-1111-1111-1111-111111111111',
  'Which attribute is used to provide alternative text for an image?',
  'multiple_choice',
  5,
  'The alt attribute provides alternative text that describes the image, which is important for accessibility and SEO.',
  8
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o1111111-1111-1111-1111-111111111801', 'q1111111-1111-1111-1111-111111111108', 'alt', true, 1),
('o1111111-1111-1111-1111-111111111802', 'q1111111-1111-1111-1111-111111111108', 'src', false, 2),
('o1111111-1111-1111-1111-111111111803', 'q1111111-1111-1111-1111-111111111108', 'title', false, 3),
('o1111111-1111-1111-1111-111111111804', 'q1111111-1111-1111-1111-111111111108', 'name', false, 4);

-- Question 9: Short Answer
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111109',
  'a1111111-1111-1111-1111-111111111111',
  'What is the correct HTML element for inserting a line break?',
  'short_answer',
  5,
  '<br>',
  'The <br> tag inserts a single line break. It is an empty/void element that does not need a closing tag.',
  9
);

-- Question 10: Multiple Choice
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q1111111-1111-1111-1111-111111111110',
  'a1111111-1111-1111-1111-111111111111',
  'Which HTML element is used to define an unordered list?',
  'multiple_choice',
  5,
  'The <ul> tag defines an unordered (bulleted) list. Use <ol> for ordered (numbered) lists.',
  10
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o1111111-1111-1111-1111-111111111001', 'q1111111-1111-1111-1111-111111111110', '<ul>', true, 1),
('o1111111-1111-1111-1111-111111111002', 'q1111111-1111-1111-1111-111111111110', '<ol>', false, 2),
('o1111111-1111-1111-1111-111111111003', 'q1111111-1111-1111-1111-111111111110', '<li>', false, 3),
('o1111111-1111-1111-1111-111111111004', 'q1111111-1111-1111-1111-111111111110', '<list>', false, 4);

-- ============================================
-- QUESTIONS FOR ARRAYS AND LISTS QUIZ
-- Assessment ID: a2222222-2222-2222-2222-222222222221
-- ============================================

-- Question 1
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222201',
  'a2222222-2222-2222-2222-222222222221',
  'What is the time complexity of accessing an element in an array by index?',
  'multiple_choice',
  5,
  'Arrays provide O(1) constant time access to elements by index because they are stored in contiguous memory locations.',
  1
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o2222222-2222-2222-2222-222222222201', 'q2222222-2222-2222-2222-222222222201', 'O(1)', true, 1),
('o2222222-2222-2222-2222-222222222202', 'q2222222-2222-2222-2222-222222222201', 'O(n)', false, 2),
('o2222222-2222-2222-2222-222222222203', 'q2222222-2222-2222-2222-222222222201', 'O(log n)', false, 3),
('o2222222-2222-2222-2222-222222222204', 'q2222222-2222-2222-2222-222222222201', 'O(n^2)', false, 4);

-- Question 2
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222202',
  'a2222222-2222-2222-2222-222222222221',
  'In a singly linked list, what does each node contain?',
  'multiple_choice',
  5,
  'Each node in a singly linked list contains data and a pointer/reference to the next node in the sequence.',
  2
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o2222222-2222-2222-2222-222222222211', 'q2222222-2222-2222-2222-222222222202', 'Data and a pointer to the next node', true, 1),
('o2222222-2222-2222-2222-222222222212', 'q2222222-2222-2222-2222-222222222202', 'Only data', false, 2),
('o2222222-2222-2222-2222-222222222213', 'q2222222-2222-2222-2222-222222222202', 'Data and pointers to both next and previous nodes', false, 3),
('o2222222-2222-2222-2222-222222222214', 'q2222222-2222-2222-2222-222222222202', 'Only a pointer to the next node', false, 4);

-- Question 3
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222203',
  'a2222222-2222-2222-2222-222222222221',
  'Arrays are stored in contiguous memory locations.',
  'true_false',
  5,
  'true',
  'Arrays store elements in contiguous (adjacent) memory locations, which allows for efficient index-based access.',
  3
);

-- Question 4
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222204',
  'a2222222-2222-2222-2222-222222222221',
  'What is the time complexity for inserting an element at the beginning of an array?',
  'multiple_choice',
  5,
  'Inserting at the beginning requires shifting all existing elements by one position, resulting in O(n) time complexity.',
  4
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o2222222-2222-2222-2222-222222222401', 'q2222222-2222-2222-2222-222222222204', 'O(n)', true, 1),
('o2222222-2222-2222-2222-222222222402', 'q2222222-2222-2222-2222-222222222204', 'O(1)', false, 2),
('o2222222-2222-2222-2222-222222222403', 'q2222222-2222-2222-2222-222222222204', 'O(log n)', false, 3),
('o2222222-2222-2222-2222-222222222404', 'q2222222-2222-2222-2222-222222222204', 'O(n log n)', false, 4);

-- Question 5
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222205',
  'a2222222-2222-2222-2222-222222222221',
  'What is the time complexity for inserting an element at the beginning of a linked list?',
  'multiple_choice',
  5,
  'Inserting at the beginning of a linked list only requires creating a new node and updating the head pointer, which is O(1).',
  5
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o2222222-2222-2222-2222-222222222501', 'q2222222-2222-2222-2222-222222222205', 'O(1)', true, 1),
('o2222222-2222-2222-2222-222222222502', 'q2222222-2222-2222-2222-222222222205', 'O(n)', false, 2),
('o2222222-2222-2222-2222-222222222503', 'q2222222-2222-2222-2222-222222222205', 'O(log n)', false, 3),
('o2222222-2222-2222-2222-222222222504', 'q2222222-2222-2222-2222-222222222205', 'O(n^2)', false, 4);

-- Question 6
INSERT INTO questions (id, assessment_id, question_text, question_type, points, correct_answer, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222206',
  'a2222222-2222-2222-2222-222222222221',
  'Linked lists allow random access to elements like arrays do.',
  'true_false',
  5,
  'false',
  'Linked lists do NOT support random access. To access an element, you must traverse from the head, resulting in O(n) access time.',
  6
);

-- Question 7
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222207',
  'a2222222-2222-2222-2222-222222222221',
  'Which data structure would you choose if you need frequent insertions and deletions at arbitrary positions?',
  'multiple_choice',
  5,
  'Linked lists are better for frequent insertions/deletions because they dont require shifting elements like arrays do.',
  7
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o2222222-2222-2222-2222-222222222701', 'q2222222-2222-2222-2222-222222222207', 'Linked List', true, 1),
('o2222222-2222-2222-2222-222222222702', 'q2222222-2222-2222-2222-222222222207', 'Array', false, 2),
('o2222222-2222-2222-2222-222222222703', 'q2222222-2222-2222-2222-222222222207', 'Both are equally efficient', false, 3),
('o2222222-2222-2222-2222-222222222704', 'q2222222-2222-2222-2222-222222222207', 'Neither is suitable', false, 4);

-- Question 8
INSERT INTO questions (id, assessment_id, question_text, question_type, points, explanation, order_index)
VALUES (
  'q2222222-2222-2222-2222-222222222208',
  'a2222222-2222-2222-2222-222222222221',
  'What type of linked list has nodes with pointers to both next and previous nodes?',
  'multiple_choice',
  5,
  'A doubly linked list contains pointers to both the next and previous nodes, allowing bidirectional traversal.',
  8
);

INSERT INTO answer_options (id, question_id, option_text, is_correct, order_index) VALUES
('o2222222-2222-2222-2222-222222222801', 'q2222222-2222-2222-2222-222222222208', 'Doubly Linked List', true, 1),
('o2222222-2222-2222-2222-222222222802', 'q2222222-2222-2222-2222-222222222208', 'Singly Linked List', false, 2),
('o2222222-2222-2222-2222-222222222803', 'q2222222-2222-2222-2222-222222222208', 'Circular Linked List', false, 3),
('o2222222-2222-2222-2222-222222222804', 'q2222222-2222-2222-2222-222222222208', 'Skip List', false, 4);
