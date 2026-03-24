// MindKraft (Vox) — Seed Data Script
// Run via: docker compose exec mongo mongosh vox /seed/seed_data.js

db = db.getSiblingDB('vox');

print('🌱 Seeding Vox database...\n');

// ═══════════════════════════════════════════════════════════════════════════════
//  STUDENTS
// ═══════════════════════════════════════════════════════════════════════════════

const students = [
  {
    studentId: 'STU001',
    registerNumber: 'STU001',
    rollNumber: 'STU001',
    fullName: 'Arjun Mehta',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@vox.local',
    department: 'Computer Science',
    year: 3,
    examCode: 'CS301',
    passwordHash: 'student123',   // plain text for dev — bcrypt in production
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    studentId: 'STU002',
    registerNumber: 'STU002',
    rollNumber: 'STU002',
    fullName: 'Priya Sharma',
    name: 'Priya Sharma',
    email: 'priya.sharma@vox.local',
    department: 'Computer Science',
    year: 3,
    examCode: 'CS301',
    passwordHash: 'student123',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    studentId: 'STU003',
    registerNumber: 'STU003',
    rollNumber: 'STU003',
    fullName: 'Rahul Verma',
    name: 'Rahul Verma',
    email: 'rahul.verma@vox.local',
    department: 'Electronics',
    year: 2,
    examCode: 'EC201',
    passwordHash: 'student123',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    studentId: 'STU004',
    registerNumber: 'STU004',
    rollNumber: 'STU004',
    fullName: 'Sneha Patel',
    name: 'Sneha Patel',
    email: 'sneha.patel@vox.local',
    department: 'Mathematics',
    year: 1,
    examCode: 'MA101',
    passwordHash: 'student123',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    studentId: 'STU005',
    registerNumber: 'STU005',
    rollNumber: 'STU005',
    fullName: 'Karthik Nair',
    name: 'Karthik Nair',
    email: 'karthik.nair@vox.local',
    department: 'Computer Science',
    year: 4,
    examCode: 'CS401',
    passwordHash: 'student123',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

students.forEach(s => {
  db.students.replaceOne({ studentId: s.studentId }, s, { upsert: true });
});
print(`✅ Inserted ${students.length} students`);

// ═══════════════════════════════════════════════════════════════════════════════
//  EXAMS
// ═══════════════════════════════════════════════════════════════════════════════

const exams = [
  // ── Exam 1: CS301 — Data Structures (MCQ + Descriptive) ───────────────────
  {
    code: 'CS301',
    title: 'Data Structures & Algorithms',
    durationMinutes: 60,
    status: 'active',
    published: true,
    instructions: 'Answer all questions. MCQs carry 2 marks each. Descriptive questions carry 5 marks each. No negative marking.',
    questions: [
      {
        id: 1, text: 'What is the time complexity of binary search?', type: 'mcq',
        options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], correctAnswer: 1,
      },
      {
        id: 2, text: 'Which data structure uses FIFO ordering?', type: 'mcq',
        options: ['Stack', 'Queue', 'Tree', 'Graph'], correctAnswer: 1,
      },
      {
        id: 3, text: 'What is the worst-case time complexity of QuickSort?', type: 'mcq',
        options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'], correctAnswer: 1,
      },
      {
        id: 4, text: 'Which of the following is a self-balancing BST?', type: 'mcq',
        options: ['Binary Search Tree', 'AVL Tree', 'Heap', 'Trie'], correctAnswer: 1,
      },
      {
        id: 5, text: 'What data structure is used in BFS traversal?', type: 'mcq',
        options: ['Stack', 'Queue', 'Priority Queue', 'Deque'], correctAnswer: 1,
      },
      {
        id: 6, text: 'Explain the difference between a stack and a queue with real-world examples.', type: 'descriptive',
      },
      {
        id: 7, text: 'Describe how a hash table handles collisions. Compare chaining vs open addressing.', type: 'descriptive',
      },
      {
        id: 8, text: 'What is dynamic programming? Explain with the Fibonacci sequence example.', type: 'descriptive',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // ── Exam 2: CS401 — Machine Learning (MCQ heavy) ─────────────────────────
  {
    code: 'CS401',
    title: 'Introduction to Machine Learning',
    durationMinutes: 45,
    status: 'active',
    published: true,
    instructions: 'All questions are multiple choice. Select the best answer. Each question carries 2 marks.',
    questions: [
      {
        id: 1, text: 'Which algorithm is used for classification?', type: 'mcq',
        options: ['Linear Regression', 'K-Means', 'Decision Tree', 'PCA'], correctAnswer: 2,
      },
      {
        id: 2, text: 'What does CNN stand for in deep learning?', type: 'mcq',
        options: ['Central Neural Network', 'Convolutional Neural Network', 'Connected Node Network', 'Computed Neuron Network'], correctAnswer: 1,
      },
      {
        id: 3, text: 'Which is an unsupervised learning algorithm?', type: 'mcq',
        options: ['Random Forest', 'K-Means Clustering', 'SVM', 'Logistic Regression'], correctAnswer: 1,
      },
      {
        id: 4, text: 'What is overfitting?', type: 'mcq',
        options: ['Model performs well on training data but poorly on test data', 'Model performs poorly on all data', 'Model is too simple', 'Model has too few features'], correctAnswer: 0,
      },
      {
        id: 5, text: 'Which activation function outputs values between 0 and 1?', type: 'mcq',
        options: ['ReLU', 'Sigmoid', 'Tanh', 'Softmax'], correctAnswer: 1,
      },
      {
        id: 6, text: 'What is the purpose of a validation set?', type: 'mcq',
        options: ['Train the model', 'Tune hyperparameters', 'Final evaluation', 'Data augmentation'], correctAnswer: 1,
      },
      {
        id: 7, text: 'Which metric is best for imbalanced classification?', type: 'mcq',
        options: ['Accuracy', 'F1 Score', 'MSE', 'R² Score'], correctAnswer: 1,
      },
      {
        id: 8, text: 'What does gradient descent minimize?', type: 'mcq',
        options: ['Accuracy', 'Precision', 'Loss function', 'Recall'], correctAnswer: 2,
      },
      {
        id: 9, text: 'Which technique prevents overfitting?', type: 'mcq',
        options: ['Adding more layers', 'Dropout', 'Increasing learning rate', 'Removing validation set'], correctAnswer: 1,
      },
      {
        id: 10, text: 'What is transfer learning?', type: 'mcq',
        options: ['Training from scratch', 'Using a pre-trained model on a new task', 'Copying data between models', 'A type of reinforcement learning'], correctAnswer: 1,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // ── Exam 3: EC201 — Digital Electronics (Mixed) ──────────────────────────
  {
    code: 'EC201',
    title: 'Digital Electronics Fundamentals',
    durationMinutes: 50,
    status: 'active',
    published: true,
    instructions: 'Section A: MCQs (2 marks each). Section B: Descriptive (5 marks each). Answer all questions.',
    questions: [
      {
        id: 1, text: 'What is the binary equivalent of decimal 13?', type: 'mcq',
        options: ['1011', '1101', '1110', '1001'], correctAnswer: 1,
      },
      {
        id: 2, text: 'Which gate is called the universal gate?', type: 'mcq',
        options: ['AND', 'OR', 'NAND', 'XOR'], correctAnswer: 2,
      },
      {
        id: 3, text: 'How many bits are in a nibble?', type: 'mcq',
        options: ['2', '4', '8', '16'], correctAnswer: 1,
      },
      {
        id: 4, text: 'What is a flip-flop?', type: 'mcq',
        options: ['Combinational circuit', 'Sequential circuit', 'Analog circuit', 'Power circuit'], correctAnswer: 1,
      },
      {
        id: 5, text: 'Which number system has base 16?', type: 'mcq',
        options: ['Binary', 'Octal', 'Decimal', 'Hexadecimal'], correctAnswer: 3,
      },
      {
        id: 6, text: 'Explain the working of a JK flip-flop with its truth table and timing diagram.', type: 'descriptive',
      },
      {
        id: 7, text: "Simplify the Boolean expression: F = A'B'C + A'BC + AB'C + ABC using a Karnaugh map.", type: 'descriptive',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // ── Exam 4: MA101 — Calculus (Descriptive heavy) ─────────────────────────
  {
    code: 'MA101',
    title: 'Engineering Mathematics — Calculus',
    durationMinutes: 90,
    status: 'active',
    published: true,
    instructions: 'Answer any 5 out of 7 questions. Each question carries 10 marks. Show all working.',
    questions: [
      {
        id: 1, text: 'Find the derivative of f(x) = x³ sin(x) + e^(2x) using the product rule and chain rule.', type: 'descriptive',
      },
      {
        id: 2, text: 'Evaluate the definite integral ∫₀¹ (x² + 3x) dx and interpret the result geometrically.', type: 'descriptive',
      },
      {
        id: 3, text: "State and prove Taylor's theorem for a function of one variable.", type: 'descriptive',
      },
      {
        id: 4, text: 'Find the area enclosed between the curves y = x² and y = 2x using integration.', type: 'descriptive',
      },
      {
        id: 5, text: 'Solve the differential equation dy/dx + 2y = e^(-x) with initial condition y(0) = 1.', type: 'descriptive',
      },
      {
        id: 6, text: 'Determine whether the series Σ(1/n²) from n=1 to ∞ converges. If so, explain why.', type: 'descriptive',
      },
      {
        id: 7, text: 'Find the maxima and minima of f(x, y) = x² + y² - 2x - 4y + 5 using partial derivatives.', type: 'descriptive',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // ── Exam 5: TECH101 — Intro to AI (default sample exam) ──────────────────
  {
    code: 'TECH101',
    title: 'Introduction to Artificial Intelligence',
    durationMinutes: 30,
    status: 'active',
    published: true,
    instructions: 'This is a quick assessment. Mix of MCQ and short answer questions.',
    questions: [
      {
        id: 1, text: 'What does AI stand for?', type: 'mcq',
        options: ['Automated Intelligence', 'Artificial Intelligence', 'Applied Informatics', 'Augmented Integration'], correctAnswer: 1,
      },
      {
        id: 2, text: 'Which of these is a type of machine learning?', type: 'mcq',
        options: ['Supervised Learning', 'Abstract Learning', 'Static Learning', 'Manual Learning'], correctAnswer: 0,
      },
      {
        id: 3, text: 'What is the Turing Test?', type: 'mcq',
        options: ['A speed test for computers', 'A test to determine if a machine can exhibit intelligent behavior', 'A hardware benchmark', 'A programming language test'], correctAnswer: 1,
      },
      {
        id: 4, text: 'Briefly explain the difference between AI, Machine Learning, and Deep Learning.', type: 'descriptive',
      },
      {
        id: 5, text: 'Name three real-world applications of artificial intelligence in everyday life.', type: 'descriptive',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

exams.forEach(e => {
  db.exams.replaceOne({ code: e.code }, e, { upsert: true });
});
print(`✅ Inserted ${exams.length} exams`);

// ═══════════════════════════════════════════════════════════════════════════════
//  SAMPLE SUBMISSIONS (for admin dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

const submissions = [
  {
    studentId: 'STU001', studentName: 'Arjun Mehta', examCode: 'CS301',
    answeredCount: 7, totalQuestions: 8, status: 'submitted',
    answers: [
      { questionIndex: 0, answer: 'O(log n)' },
      { questionIndex: 1, answer: 'Queue' },
      { questionIndex: 2, answer: 'O(n²)' },
      { questionIndex: 3, answer: 'AVL Tree' },
      { questionIndex: 4, answer: 'Queue' },
      { questionIndex: 5, answer: 'A stack follows LIFO (Last In First Out) like a pile of plates. A queue follows FIFO (First In First Out) like a queue at a ticket counter.' },
      { questionIndex: 6, answer: 'Hash tables handle collisions using chaining (linked lists at each bucket) or open addressing (probing for next empty slot). Chaining is simpler but uses more memory.' },
    ],
    submittedAt: new Date(),
  },
  {
    studentId: 'STU002', studentName: 'Priya Sharma', examCode: 'CS301',
    answeredCount: 8, totalQuestions: 8, status: 'submitted',
    answers: [
      { questionIndex: 0, answer: 'O(log n)' },
      { questionIndex: 1, answer: 'Queue' },
      { questionIndex: 2, answer: 'O(n²)' },
      { questionIndex: 3, answer: 'AVL Tree' },
      { questionIndex: 4, answer: 'Queue' },
      { questionIndex: 5, answer: 'Stack is LIFO - like browser back button history. Queue is FIFO - like a printer queue processing jobs in order.' },
      { questionIndex: 6, answer: 'Collisions occur when two keys hash to the same index. Chaining stores a linked list at each slot. Open addressing finds the next available slot using linear or quadratic probing.' },
      { questionIndex: 7, answer: 'Dynamic programming breaks problems into overlapping subproblems and stores their solutions. For Fibonacci: instead of recursive O(2^n), we use a table to store F(0)=0, F(1)=1, then compute F(n) = F(n-1) + F(n-2) in O(n).' },
    ],
    submittedAt: new Date(),
  },
  {
    studentId: 'STU003', studentName: 'Rahul Verma', examCode: 'EC201',
    answeredCount: 6, totalQuestions: 7, status: 'submitted',
    answers: [
      { questionIndex: 0, answer: '1101' },
      { questionIndex: 1, answer: 'NAND' },
      { questionIndex: 2, answer: '4' },
      { questionIndex: 3, answer: 'Sequential circuit' },
      { questionIndex: 4, answer: 'Hexadecimal' },
      { questionIndex: 5, answer: 'A JK flip-flop has two inputs J and K. When J=K=0 it holds state, J=1 K=0 sets to 1, J=0 K=1 resets to 0, and J=K=1 toggles the output.' },
    ],
    submittedAt: new Date(),
  },
  {
    studentId: 'STU005', studentName: 'Karthik Nair', examCode: 'CS401',
    answeredCount: 10, totalQuestions: 10, status: 'submitted',
    answers: [
      { questionIndex: 0, answer: 'Decision Tree' },
      { questionIndex: 1, answer: 'Convolutional Neural Network' },
      { questionIndex: 2, answer: 'K-Means Clustering' },
      { questionIndex: 3, answer: 'Model performs well on training data but poorly on test data' },
      { questionIndex: 4, answer: 'Sigmoid' },
      { questionIndex: 5, answer: 'Tune hyperparameters' },
      { questionIndex: 6, answer: 'F1 Score' },
      { questionIndex: 7, answer: 'Loss function' },
      { questionIndex: 8, answer: 'Dropout' },
      { questionIndex: 9, answer: 'Using a pre-trained model on a new task' },
    ],
    submittedAt: new Date(),
  },
];

submissions.forEach(s => {
  db.submissions.replaceOne(
    { studentId: s.studentId, examCode: s.examCode },
    { $set: s },
    { upsert: true }
  );
});
print(`✅ Inserted ${submissions.length} submissions`);

// ═══════════════════════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════════

const audits = [
  { studentId: 'STU001', examCode: 'CS301', action: 'EXAM_START', timestamp: new Date(Date.now() - 3600000) },
  { studentId: 'STU001', examCode: 'CS301', action: 'EXAM_SUBMITTED', timestamp: new Date(Date.now() - 1800000) },
  { studentId: 'STU002', examCode: 'CS301', action: 'EXAM_START', timestamp: new Date(Date.now() - 3500000) },
  { studentId: 'STU002', examCode: 'CS301', action: 'EXAM_SUBMITTED', timestamp: new Date(Date.now() - 1500000) },
  { studentId: 'STU003', examCode: 'EC201', action: 'EXAM_START', timestamp: new Date(Date.now() - 7200000) },
  { studentId: 'STU003', examCode: 'EC201', action: 'EXAM_SUBMITTED', timestamp: new Date(Date.now() - 5400000) },
  { studentId: 'STU005', examCode: 'CS401', action: 'EXAM_START', timestamp: new Date(Date.now() - 2400000) },
  { studentId: 'STU005', examCode: 'CS401', action: 'EXAM_SUBMITTED', timestamp: new Date(Date.now() - 900000) },
];

db.audits.insertMany(audits);
print(`✅ Inserted ${audits.length} audit logs`);

// ═══════════════════════════════════════════════════════════════════════════════
//  AI CONFIGURATION (singleton)
// ═══════════════════════════════════════════════════════════════════════════════

db.ai_configurations.replaceOne(
  { singletonKey: 'global' },
  {
    singletonKey: 'global',
    sttEngine: 'whisper',
    llmModel: 'llama3:latest',
    grammarCorrection: true,
    autoSaveInterval: 15,
    multilingualMode: false,
    ttsSpeed: 1.0,
    updatedAt: new Date(),
  },
  { upsert: true }
);
print('✅ AI configuration set');

// ═══════════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

print('\n📊 Database Summary:');
db.getCollectionNames().forEach(c => {
  print(`   ${c}: ${db[c].countDocuments()} documents`);
});
print('\n🎉 Seed data complete!\n');
print('👤 Student logins (email / password):');
print('   arjun.mehta@vox.local / student123');
print('   priya.sharma@vox.local / student123');
print('   rahul.verma@vox.local / student123');
print('   sneha.patel@vox.local / student123');
print('   karthik.nair@vox.local / student123');
print('\n📝 Exams: CS301, CS401, EC201, MA101, TECH101');
